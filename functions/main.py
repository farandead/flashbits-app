"""
GitHub OAuth Token Exchange Cloud Function
Exchanges GitHub authorization code for access token and creates Firebase user
Version: 1.4 - With rate limiting
"""

from firebase_functions import https_fn, options
from firebase_functions.params import SecretParam
from firebase_admin import initialize_app, auth, credentials
import requests
import json
import time
from collections import defaultdict
from threading import Lock

# Initialize Firebase Admin with service account
cred = credentials.Certificate('flashprep-11c85-firebase-adminsdk-fbsvc-fe4af16e3b.json')
initialize_app(cred)

# Set CORS and other global options
options.set_global_options(max_instances=10)

# Define secrets
GITHUB_CLIENT_ID = SecretParam('GITHUB_CLIENT_ID')
GITHUB_CLIENT_SECRET = SecretParam('GITHUB_CLIENT_SECRET')

# Rate limiting configuration
RATE_LIMIT_WINDOW = 60  # Time window in seconds (1 minute)
RATE_LIMIT_MAX_REQUESTS = 10  # Maximum requests per window per IP
RATE_LIMIT_CLEANUP_INTERVAL = 300  # Clean up old entries every 5 minutes

# Rate limiting storage (in-memory, per instance)
# In production, consider using Firestore or Redis for distributed rate limiting
_rate_limit_store = defaultdict(list)  # IP -> list of request timestamps
_rate_limit_lock = Lock()
_last_cleanup = time.time()


def _get_client_ip(req: https_fn.Request) -> str:
    """Extract client IP address from request."""
    # Check X-Forwarded-For header (set by Firebase/Cloud Load Balancer)
    forwarded_for = req.headers.get('X-Forwarded-For')
    if forwarded_for:
        # X-Forwarded-For can contain multiple IPs, take the first one
        return forwarded_for.split(',')[0].strip()
    
    # Fallback to direct connection IP
    return req.headers.get('X-Real-IP', 'unknown')


def _cleanup_old_entries():
    """Remove old entries from rate limit store to prevent memory leaks."""
    global _last_cleanup, _rate_limit_store
    
    current_time = time.time()
    if current_time - _last_cleanup < RATE_LIMIT_CLEANUP_INTERVAL:
        return
    
    with _rate_limit_lock:
        cutoff_time = current_time - RATE_LIMIT_WINDOW
        for ip in list(_rate_limit_store.keys()):
            # Remove timestamps older than the window
            _rate_limit_store[ip] = [
                timestamp for timestamp in _rate_limit_store[ip]
                if timestamp > cutoff_time
            ]
            # Remove IPs with no recent requests
            if not _rate_limit_store[ip]:
                del _rate_limit_store[ip]
        
        _last_cleanup = current_time


def _check_rate_limit(ip: str, add_request: bool = True) -> tuple[bool, int, int]:
    """
    Check if IP address has exceeded rate limit.
    
    Args:
        ip: Client IP address
        add_request: If True, add current request to the count. If False, just check.
    
    Returns:
        (is_allowed, remaining_requests, reset_after_seconds)
    """
    current_time = time.time()
    window_start = current_time - RATE_LIMIT_WINDOW
    
    with _rate_limit_lock:
        # Clean up old entries periodically
        _cleanup_old_entries()
        
        # Get recent requests for this IP
        recent_requests = [
            timestamp for timestamp in _rate_limit_store[ip]
            if timestamp > window_start
        ]
        
        # Count requests in current window
        request_count = len(recent_requests)
        
        if request_count >= RATE_LIMIT_MAX_REQUESTS:
            # Calculate when the oldest request in window will expire
            if recent_requests:
                oldest_request = min(recent_requests)
                reset_after = int(RATE_LIMIT_WINDOW - (current_time - oldest_request)) + 1
            else:
                reset_after = RATE_LIMIT_WINDOW
            
            return (False, 0, reset_after)
        
        # Add current request timestamp if requested
        if add_request:
            recent_requests.append(current_time)
            _rate_limit_store[ip] = recent_requests
        
        remaining = RATE_LIMIT_MAX_REQUESTS - (request_count + (1 if add_request else 0))
        return (True, remaining, RATE_LIMIT_WINDOW)




@https_fn.on_request(
    cors=options.CorsOptions(
        cors_origins="*",
        cors_methods=["GET", "POST", "OPTIONS"]
    ),
    secrets=[GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET],
    timeout_sec=60  # Increase timeout to 60 seconds (max for 1st gen functions)
)
def exchangeGitHubCode(req: https_fn.Request) -> https_fn.Response:
    """
    Exchange GitHub authorization code for access token.
    
    Expected POST body:
    {
        "code": "authorization_code_from_github"
    }
    """
    
    # Handle preflight OPTIONS request
    if req.method == 'OPTIONS':
        return https_fn.Response(
            '',
            status=204,
            headers={
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '3600'
            }
        )
    
    # Only allow POST
    if req.method != 'POST':
        return https_fn.Response(
            json.dumps({'error': 'Method not allowed'}),
            status=405,
            headers={
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        )
    
    # Rate limiting check
    client_ip = _get_client_ip(req)
    is_allowed, remaining, reset_after = _check_rate_limit(client_ip)
    
    if not is_allowed:
        return https_fn.Response(
            json.dumps({
                'error': 'Rate limit exceeded',
                'message': f'Too many requests. Please try again in {reset_after} seconds.',
                'retry_after': reset_after
            }),
            status=429,
            headers={
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'X-RateLimit-Limit': str(RATE_LIMIT_MAX_REQUESTS),
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': str(int(time.time()) + reset_after),
                'Retry-After': str(reset_after)
            }
        )
    
    try:
        # Parse request body
        request_data = req.get_json()
        
        if not request_data or 'code' not in request_data:
            return https_fn.Response(
                json.dumps({'error': 'Missing authorization code'}),
                status=400,
                headers={
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            )
        
        code = request_data['code']
        
        # Get secret values
        client_id = GITHUB_CLIENT_ID.value
        client_secret = GITHUB_CLIENT_SECRET.value
        
        # Check if credentials are configured
        if not client_id or not client_secret:
            return https_fn.Response(
                json.dumps({'error': 'GitHub OAuth not configured'}),
                status=500,
                headers={
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            )
        
        # Exchange code for access token with GitHub
        github_response = requests.post(
            'https://github.com/login/oauth/access_token',
            data={
                'client_id': client_id,
                'client_secret': client_secret,
                'code': code
            },
            headers={
                'Accept': 'application/json'
            },
            timeout=30  # Increased timeout for GitHub API calls
        )
        
        # Log the response for debugging
        print(f"GitHub token response status: {github_response.status_code}")
        print(f"GitHub token response body: {github_response.text}")
        
        if github_response.status_code != 200:
            return https_fn.Response(
                json.dumps({
                    'error': 'Failed to exchange code with GitHub',
                    'details': github_response.text,
                    'status': github_response.status_code
                }),
                status=github_response.status_code,
                headers={
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            )
        
        github_data = github_response.json()
        
        # Log the parsed data
        print(f"GitHub token data: {github_data}")
        
        # Check for error from GitHub
        if 'error' in github_data:
            error_msg = github_data.get('error_description', github_data['error'])
            print(f"GitHub OAuth error: {error_msg}")
            return https_fn.Response(
                json.dumps({
                    'error': error_msg,
                    'github_error': github_data
                }),
                status=400,
                headers={
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            )
        
        access_token = github_data.get('access_token')
        if not access_token:
            return https_fn.Response(
                json.dumps({'error': 'No access token received from GitHub'}),
                status=500,
                headers={
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            )
        
        # Get GitHub user info
        user_response = requests.get(
            'https://api.github.com/user',
            headers={
                'Authorization': f'Bearer {access_token}',
                'Accept': 'application/json'
            },
            timeout=30  # Increased timeout for GitHub API calls
        )
        
        if user_response.status_code != 200:
            return https_fn.Response(
                json.dumps({'error': 'Failed to get user info from GitHub'}),
                status=user_response.status_code,
                headers={
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            )
        
        user_data = user_response.json()
        github_id = str(user_data.get('id'))
        github_email = user_data.get('email')
        github_name = user_data.get('name') or user_data.get('login')
        github_photo = user_data.get('avatar_url')
        
        # Create or get Firebase user with account linking support
        uid = None
        
        # First, try to find existing user by email (for account linking)
        if github_email:
            try:
                firebase_user = auth.get_user_by_email(github_email)
                uid = firebase_user.uid
                print(f"Found existing user by email: {uid}")
                
                # Update existing user with GitHub info
                auth.update_user(
                    uid,
                    display_name=github_name,
                    photo_url=github_photo,
                    email_verified=True
                )
            except auth.UserNotFoundError:
                print(f"No existing user found with email: {github_email}")
        
        # If no user found by email, try custom GitHub UID
        if not uid:
            custom_uid = f'github:{github_id}'
            try:
                firebase_user = auth.get_user(custom_uid)
                uid = firebase_user.uid
                print(f"Found existing user by GitHub UID: {uid}")
                
                # Update user info
                update_params = {
                    'display_name': github_name,
                    'photo_url': github_photo
                }
                if github_email:
                    update_params['email'] = github_email
                    
                auth.update_user(uid, **update_params)
                
            except auth.UserNotFoundError:
                print(f"Creating new user with GitHub UID: {custom_uid}")
                # Create new user with custom UID
                user_params = {
                    'uid': custom_uid,
                    'display_name': github_name,
                    'photo_url': github_photo,
                    'email_verified': True
                }
                
                # Only add email if it exists
                if github_email:
                    user_params['email'] = github_email
                
                firebase_user = auth.create_user(**user_params)
                uid = firebase_user.uid
        
        # Create custom token for Firebase auth
        print(f"Creating custom token for UID: {uid}")
        try:
            custom_token = auth.create_custom_token(uid)
            print(f"Custom token created successfully")
        except Exception as token_error:
            print(f"Error creating custom token: {token_error}")
            raise
        
        # Return the custom token
        response_data = {
            'customToken': custom_token.decode('utf-8'),
            'user': {
                'uid': uid,
                'email': github_email,
                'displayName': github_name,
                'photoURL': github_photo
            }
        }
        print(f"Returning response with custom token")
        
        # Get current rate limit status for response headers (don't add another request)
        _, remaining, _ = _check_rate_limit(client_ip, add_request=False)
        
        return https_fn.Response(
            json.dumps(response_data),
            status=200,
            headers={
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'X-RateLimit-Limit': str(RATE_LIMIT_MAX_REQUESTS),
                'X-RateLimit-Remaining': str(remaining),
                'X-RateLimit-Reset': str(int(time.time()) + RATE_LIMIT_WINDOW)
            }
        )
        
    except Exception as e:
        print(f"Function error: {str(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return https_fn.Response(
            json.dumps({'error': str(e)}),
            status=500,
            headers={
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        )
        
