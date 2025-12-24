#!/usr/bin/env python3
"""
FlashPrep - Duplicate Question Checker

This script checks for duplicate questions in your Firebase Firestore database.

Setup:
1. Make sure you have the service account key at scripts/serviceAccountKey.json
2. Install dependencies: pip install firebase-admin
3. Run: python check_duplicates.py

Options:
  --delete    Delete duplicate questions (keeps first occurrence)
  --similar   Also check for similar questions (slower)
  --export    Export duplicates to a JSON file
"""

import os
import sys
import json
import argparse
import re
from collections import defaultdict
from difflib import SequenceMatcher

try:
    import firebase_admin
    from firebase_admin import credentials, firestore
except ImportError:
    print("❌ firebase-admin not installed!")
    print("Run: pip install firebase-admin")
    sys.exit(1)


SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SERVICE_ACCOUNT_PATH = os.path.join(SCRIPT_DIR, "serviceAccountKey.json")


def init_firebase():
    """Initialize Firebase Admin SDK"""
    if not os.path.exists(SERVICE_ACCOUNT_PATH):
        print(f"❌ Service account key not found at: {SERVICE_ACCOUNT_PATH}")
        print("\nTo fix this:")
        print("1. Go to Firebase Console > Project Settings > Service Accounts")
        print("2. Click 'Generate new private key'")
        print("3. Save the file as 'serviceAccountKey.json' in the scripts folder")
        sys.exit(1)
    
    try:
        cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
        firebase_admin.initialize_app(cred)
        print("✅ Firebase initialized successfully\n")
        return firestore.client()
    except Exception as e:
        print(f"❌ Failed to initialize Firebase: {e}")
        sys.exit(1)


def normalize_text(text):
    """Normalize text for comparison"""
    if not text:
        return ""
    # Remove special characters, convert to lowercase, normalize whitespace
    text = re.sub(r'[^a-zA-Z0-9\s]', '', text.lower())
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def calculate_similarity(text1, text2):
    """Calculate similarity ratio between two texts"""
    return SequenceMatcher(None, text1, text2).ratio()


def fetch_all_questions(db):
    """Fetch all questions from Firestore"""
    print("📥 Fetching questions from Firestore...")
    questions_ref = db.collection("questions")
    docs = questions_ref.stream()
    
    questions = []
    for doc in docs:
        data = doc.to_dict()
        data['id'] = doc.id
        questions.append(data)
    
    print(f"   Found {len(questions)} questions\n")
    return questions


def find_exact_duplicates(questions):
    """Find exact duplicate questions"""
    print("🔍 Checking for exact duplicates...")
    
    question_map = defaultdict(list)
    
    for q in questions:
        normalized = normalize_text(q.get('question', ''))
        question_map[normalized].append(q)
    
    duplicates = []
    for normalized_text, group in question_map.items():
        if len(group) > 1:
            duplicates.append({
                'text': group[0].get('question', '')[:100],
                'count': len(group),
                'questions': group
            })
    
    return duplicates


def find_similar_questions(questions, threshold=0.8):
    """Find similar (but not exact) questions"""
    print("🔄 Checking for similar questions (this may take a while)...")
    
    similar_pairs = []
    checked = set()
    
    for i, q1 in enumerate(questions):
        if i % 100 == 0 and i > 0:
            print(f"   Processed {i}/{len(questions)} questions...")
        
        text1 = normalize_text(q1.get('question', ''))
        if not text1:
            continue
            
        for j, q2 in enumerate(questions[i+1:], start=i+1):
            key = f"{q1['id']}-{q2['id']}"
            if key in checked:
                continue
            
            text2 = normalize_text(q2.get('question', ''))
            if not text2:
                continue
            
            similarity = calculate_similarity(text1, text2)
            
            if threshold < similarity < 1.0:
                similar_pairs.append({
                    'q1': q1,
                    'q2': q2,
                    'similarity': round(similarity * 100, 1)
                })
                checked.add(key)
        
        # Limit to avoid too many results
        if len(similar_pairs) >= 100:
            break
    
    return sorted(similar_pairs, key=lambda x: x['similarity'], reverse=True)


def delete_duplicates(db, duplicates, keep_first=True):
    """Delete duplicate questions, keeping the first occurrence"""
    print("\n🗑️  Deleting duplicates...")
    
    deleted_count = 0
    for group in duplicates:
        questions_to_delete = group['questions'][1:] if keep_first else group['questions']
        
        for q in questions_to_delete:
            try:
                db.collection("questions").document(q['id']).delete()
                deleted_count += 1
                print(f"   Deleted: {q['id'][:12]}... ({q.get('topic', 'Unknown')})")
            except Exception as e:
                print(f"   ❌ Failed to delete {q['id']}: {e}")
    
    print(f"\n✅ Deleted {deleted_count} duplicate questions")
    return deleted_count


def export_duplicates(duplicates, similar_pairs, filename):
    """Export duplicate information to JSON"""
    export_data = {
        'exact_duplicates': [
            {
                'text': d['text'],
                'count': d['count'],
                'ids': [q['id'] for q in d['questions']]
            }
            for d in duplicates
        ],
        'similar_questions': [
            {
                'similarity': p['similarity'],
                'q1_id': p['q1']['id'],
                'q1_text': p['q1'].get('question', '')[:100],
                'q2_id': p['q2']['id'],
                'q2_text': p['q2'].get('question', '')[:100]
            }
            for p in similar_pairs
        ]
    }
    
    with open(filename, 'w') as f:
        json.dump(export_data, f, indent=2)
    
    print(f"\n📁 Exported to {filename}")


def print_report(duplicates, similar_pairs, total_questions):
    """Print a summary report"""
    print("\n" + "="*60)
    print("📊 DUPLICATE CHECK REPORT")
    print("="*60)
    
    duplicate_count = sum(d['count'] - 1 for d in duplicates)
    
    print(f"\n📈 Summary:")
    print(f"   Total questions:     {total_questions}")
    print(f"   Unique questions:    {total_questions - duplicate_count}")
    print(f"   Duplicate groups:    {len(duplicates)}")
    print(f"   Extra copies:        {duplicate_count}")
    print(f"   Similar pairs:       {len(similar_pairs)}")
    
    if duplicates:
        print(f"\n⚠️  Exact Duplicates ({len(duplicates)} groups):")
        for i, d in enumerate(duplicates[:10], 1):
            print(f"\n   {i}. \"{d['text'][:60]}...\"")
            print(f"      {d['count']} copies:")
            for q in d['questions'][:5]:
                topic = q.get('topic', 'Unknown')
                diff = q.get('difficulty', 'unknown')
                print(f"        - {q['id'][:12]}... [{topic}/{diff}]")
            if len(d['questions']) > 5:
                print(f"        ... and {len(d['questions']) - 5} more")
        
        if len(duplicates) > 10:
            print(f"\n   ... and {len(duplicates) - 10} more duplicate groups")
    
    if similar_pairs:
        print(f"\n🔄 Similar Questions ({len(similar_pairs)} pairs):")
        for i, p in enumerate(similar_pairs[:5], 1):
            print(f"\n   {i}. {p['similarity']}% similar:")
            print(f"      A: \"{p['q1'].get('question', '')[:50]}...\"")
            print(f"      B: \"{p['q2'].get('question', '')[:50]}...\"")
        
        if len(similar_pairs) > 5:
            print(f"\n   ... and {len(similar_pairs) - 5} more similar pairs")
    
    if not duplicates and not similar_pairs:
        print("\n✅ No duplicates or similar questions found!")
    
    print("\n" + "="*60)


def main():
    parser = argparse.ArgumentParser(description="Check for duplicate questions in Firebase")
    parser.add_argument("--delete", action="store_true", help="Delete duplicate questions (keeps first)")
    parser.add_argument("--similar", action="store_true", help="Also check for similar questions")
    parser.add_argument("--export", metavar="FILE", help="Export results to JSON file")
    parser.add_argument("--threshold", type=float, default=0.8, help="Similarity threshold (0-1)")
    args = parser.parse_args()
    
    print("\n" + "="*60)
    print("🔍 FlashPrep Duplicate Checker")
    print("="*60 + "\n")
    
    # Initialize Firebase
    db = init_firebase()
    
    # Fetch questions
    questions = fetch_all_questions(db)
    
    if not questions:
        print("No questions found in the database.")
        return
    
    # Find exact duplicates
    duplicates = find_exact_duplicates(questions)
    
    # Find similar questions (optional)
    similar_pairs = []
    if args.similar:
        similar_pairs = find_similar_questions(questions, args.threshold)
    
    # Print report
    print_report(duplicates, similar_pairs, len(questions))
    
    # Export if requested
    if args.export:
        export_duplicates(duplicates, similar_pairs, args.export)
    
    # Delete if requested
    if args.delete and duplicates:
        confirm = input("\n⚠️  Are you sure you want to delete duplicates? (yes/no): ")
        if confirm.lower() == 'yes':
            delete_duplicates(db, duplicates)
        else:
            print("Deletion cancelled.")
    
    print("\n✨ Done!")


if __name__ == "__main__":
    main()

