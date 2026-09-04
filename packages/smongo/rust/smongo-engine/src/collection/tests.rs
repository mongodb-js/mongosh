use super::*;
use crate::database::Database;
use crate::index::IndexOptions;
use bson::doc;
use tempfile::TempDir;

fn setup_collection() -> (TempDir, Collection) {
    let temp_dir = TempDir::new().unwrap();
    let db = Database::open(temp_dir.path().join("testdb")).unwrap();
    let collection = db.collection("test").unwrap();
    (temp_dir, collection)
}

#[test]
fn test_insert_one_generates_id() {
    let (_temp_dir, collection) = setup_collection();
    let doc = doc! { "name": "Alice", "age": 30 };
    let result = collection.insert_one(doc).unwrap();
    assert!(matches!(result.inserted_id, Bson::ObjectId(_)));
}

#[test]
fn test_insert_one_preserves_id() {
    let (_temp_dir, collection) = setup_collection();
    let id = ObjectId::new();
    let doc = doc! { "_id": id, "name": "Bob" };
    let result = collection.insert_one(doc).unwrap();
    assert_eq!(result.inserted_id, Bson::ObjectId(id));
}

#[test]
fn test_insert_many() {
    let (_temp_dir, collection) = setup_collection();
    let docs = vec![
        doc! { "name": "Alice" },
        doc! { "name": "Bob" },
        doc! { "name": "Charlie" },
    ];
    let result = collection.insert_many(docs).unwrap();
    assert_eq!(result.inserted_ids.len(), 3);
}

#[test]
fn test_find_one() {
    let (_temp_dir, collection) = setup_collection();
    collection
        .insert_one(doc! { "name": "Alice", "age": 30 })
        .unwrap();
    collection
        .insert_one(doc! { "name": "Bob", "age": 25 })
        .unwrap();

    let result = collection.find_one(doc! { "name": "Alice" }).unwrap();
    assert!(result.is_some());
    let doc = result.unwrap();
    assert_eq!(doc.get_str("name").unwrap(), "Alice");
}

#[test]
fn test_find_one_not_found() {
    let (_temp_dir, collection) = setup_collection();
    collection.insert_one(doc! { "name": "Alice" }).unwrap();

    let result = collection.find_one(doc! { "name": "Bob" }).unwrap();
    assert!(result.is_none());
}

#[test]
fn test_find_all() {
    let (_temp_dir, collection) = setup_collection();
    collection
        .insert_one(doc! { "name": "Alice", "age": 30 })
        .unwrap();
    collection
        .insert_one(doc! { "name": "Bob", "age": 25 })
        .unwrap();
    collection
        .insert_one(doc! { "name": "Charlie", "age": 35 })
        .unwrap();

    let results = collection.find(doc! {}).unwrap();
    assert_eq!(results.len(), 3);
}

#[test]
fn test_find_with_filter() {
    let (_temp_dir, collection) = setup_collection();
    collection
        .insert_one(doc! { "name": "Alice", "age": 30 })
        .unwrap();
    collection
        .insert_one(doc! { "name": "Bob", "age": 25 })
        .unwrap();
    collection
        .insert_one(doc! { "name": "Charlie", "age": 35 })
        .unwrap();

    let results = collection.find(doc! { "age": { "$gte": 30 } }).unwrap();
    assert_eq!(results.len(), 2);
}

#[test]
fn test_update_one() {
    let (_temp_dir, collection) = setup_collection();
    collection
        .insert_one(doc! { "name": "Alice", "age": 30 })
        .unwrap();
    collection
        .insert_one(doc! { "name": "Bob", "age": 25 })
        .unwrap();

    let result = collection
        .update_one(doc! { "name": "Alice" }, doc! { "$set": { "age": 31 } })
        .unwrap();
    assert_eq!(result.matched_count, 1);
    assert_eq!(result.modified_count, 1);

    let doc = collection
        .find_one(doc! { "name": "Alice" })
        .unwrap()
        .unwrap();
    assert_eq!(doc.get_i32("age").unwrap(), 31);
}

#[test]
fn test_update_one_no_match() {
    let (_temp_dir, collection) = setup_collection();
    collection.insert_one(doc! { "name": "Alice" }).unwrap();

    let result = collection
        .update_one(doc! { "name": "Bob" }, doc! { "$set": { "age": 30 } })
        .unwrap();
    assert_eq!(result.matched_count, 0);
    assert_eq!(result.modified_count, 0);
}

#[test]
fn test_update_many() {
    let (_temp_dir, collection) = setup_collection();
    collection
        .insert_one(doc! { "status": "pending", "value": 10 })
        .unwrap();
    collection
        .insert_one(doc! { "status": "pending", "value": 20 })
        .unwrap();
    collection
        .insert_one(doc! { "status": "active", "value": 30 })
        .unwrap();

    let result = collection
        .update_many(
            doc! { "status": "pending" },
            doc! { "$set": { "status": "active" } },
        )
        .unwrap();
    assert_eq!(result.matched_count, 2);
    assert_eq!(result.modified_count, 2);

    let active = collection.find(doc! { "status": "active" }).unwrap();
    assert_eq!(active.len(), 3);
}

#[test]
fn test_delete_one() {
    let (_temp_dir, collection) = setup_collection();
    collection.insert_one(doc! { "name": "Alice" }).unwrap();
    collection.insert_one(doc! { "name": "Bob" }).unwrap();

    let result = collection.delete_one(doc! { "name": "Alice" }).unwrap();
    assert_eq!(result.deleted_count, 1);

    let remaining = collection.find(doc! {}).unwrap();
    assert_eq!(remaining.len(), 1);
    assert_eq!(remaining[0].get_str("name").unwrap(), "Bob");
}

#[test]
fn test_delete_one_no_match() {
    let (_temp_dir, collection) = setup_collection();
    collection.insert_one(doc! { "name": "Alice" }).unwrap();

    let result = collection.delete_one(doc! { "name": "Bob" }).unwrap();
    assert_eq!(result.deleted_count, 0);
}

#[test]
fn test_delete_many() {
    let (_temp_dir, collection) = setup_collection();
    collection
        .insert_one(doc! { "status": "old", "value": 10 })
        .unwrap();
    collection
        .insert_one(doc! { "status": "old", "value": 20 })
        .unwrap();
    collection
        .insert_one(doc! { "status": "new", "value": 30 })
        .unwrap();

    let result = collection.delete_many(doc! { "status": "old" }).unwrap();
    assert_eq!(result.deleted_count, 2);

    let remaining = collection.find(doc! {}).unwrap();
    assert_eq!(remaining.len(), 1);
}

#[test]
fn test_count_documents_all() {
    let (_temp_dir, collection) = setup_collection();
    collection.insert_one(doc! { "a": 1 }).unwrap();
    collection.insert_one(doc! { "a": 2 }).unwrap();
    collection.insert_one(doc! { "a": 3 }).unwrap();

    let count = collection.count_documents(None).unwrap();
    assert_eq!(count, 3);
}

#[test]
fn test_count_documents_with_filter() {
    let (_temp_dir, collection) = setup_collection();
    collection.insert_one(doc! { "age": 25 }).unwrap();
    collection.insert_one(doc! { "age": 30 }).unwrap();
    collection.insert_one(doc! { "age": 35 }).unwrap();

    let count = collection
        .count_documents(Some(doc! { "age": { "$gte": 30 } }))
        .unwrap();
    assert_eq!(count, 2);
}

#[test]
fn test_count_empty_collection() {
    let (_temp_dir, collection) = setup_collection();
    let count = collection.count_documents(None).unwrap();
    assert_eq!(count, 0);
}

// ============================================================
// INDEX TESTS (Phase 7)
// ============================================================

#[test]
fn test_create_index_single_field() {
    let (_temp_dir, collection) = setup_collection();

    let index_name = collection.create_index(doc! { "email": 1 }, None).unwrap();
    assert_eq!(index_name, "email_1");

    let indexes = collection.list_indexes().unwrap();
    assert_eq!(indexes.len(), 1);
    assert_eq!(indexes[0].name, "email_1");
}

#[test]
fn test_create_index_compound() {
    let (_temp_dir, collection) = setup_collection();

    let index_name = collection
        .create_index(doc! { "age": 1, "name": -1 }, None)
        .unwrap();
    assert!(index_name.contains("age_1"));
    assert!(index_name.contains("name_-1"));

    let indexes = collection.list_indexes().unwrap();
    assert_eq!(indexes.len(), 1);
}

#[test]
fn test_create_index_custom_name() {
    let (_temp_dir, collection) = setup_collection();
    collection
        .insert_one(doc! { "email": "a@example.com" })
        .unwrap();
    let nm = collection
        .create_index(
            doc! { "email": 1 },
            Some(crate::index::IndexOptions {
                name: Some("atlas_email_idx".to_string()),
                ..Default::default()
            }),
        )
        .unwrap();
    assert_eq!(nm, "atlas_email_idx");
    let indexes = collection.list_indexes().unwrap();
    assert!(indexes.iter().any(|s| s.name == "atlas_email_idx"));
}

#[test]
fn test_create_index_rejects_bad_custom_name() {
    let (_temp_dir, collection) = setup_collection();
    let result = collection.create_index(
        doc! { "email": 1 },
        Some(crate::index::IndexOptions {
            name: Some("bad.name".to_string()),
            ..Default::default()
        }),
    );
    assert!(result.is_err());
}

#[test]
fn test_create_index_unique() {
    let (_temp_dir, collection) = setup_collection();

    collection
        .insert_one(doc! { "email": "alice@example.com", "name": "Alice" })
        .unwrap();

    let index_name = collection
        .create_index(
            doc! { "email": 1 },
            Some(crate::index::IndexOptions {
                unique: true,
                ..Default::default()
            }),
        )
        .unwrap();
    assert_eq!(index_name, "email_1");

    let result = collection.insert_one(doc! { "email": "alice@example.com", "name": "Alice2" });
    assert!(result.is_err());
    assert!(matches!(
        result,
        Err(CollectionError::UniqueConstraintViolation(_))
    ));
}

#[test]
fn test_create_index_on_existing_data() {
    let (_temp_dir, collection) = setup_collection();

    collection
        .insert_one(doc! { "email": "alice@example.com", "age": 30 })
        .unwrap();
    collection
        .insert_one(doc! { "email": "bob@example.com", "age": 25 })
        .unwrap();
    collection
        .insert_one(doc! { "email": "charlie@example.com", "age": 35 })
        .unwrap();

    let index_name = collection.create_index(doc! { "email": 1 }, None).unwrap();
    assert_eq!(index_name, "email_1");

    let indexes = collection.list_indexes().unwrap();
    assert_eq!(indexes.len(), 1);
}

#[test]
fn test_create_index_duplicate_is_idempotent() {
    let (_temp_dir, collection) = setup_collection();

    let name1 = collection.create_index(doc! { "email": 1 }, None).unwrap();
    let name2 = collection.create_index(doc! { "email": 1 }, None).unwrap();
    assert_eq!(name1, name2);

    let indexes = collection.list_indexes().unwrap();
    assert_eq!(indexes.len(), 1);
}

#[test]
fn test_create_index_different_keys_same_name_fails() {
    let (_temp_dir, collection) = setup_collection();

    collection.create_index(doc! { "email": 1 }, None).unwrap();

    let result = collection.create_index(
        doc! { "age": 1 },
        Some(IndexOptions {
            name: Some("email_1".to_string()),
            ..Default::default()
        }),
    );
    assert!(result.is_err());
    assert!(matches!(
        result,
        Err(CollectionError::IndexAlreadyExists(_))
    ));
}

#[test]
fn test_list_indexes() {
    let (_temp_dir, collection) = setup_collection();

    let indexes = collection.list_indexes().unwrap();
    assert_eq!(indexes.len(), 0);

    collection.create_index(doc! { "email": 1 }, None).unwrap();
    collection.create_index(doc! { "age": 1 }, None).unwrap();
    collection
        .create_index(doc! { "name": 1, "age": -1 }, None)
        .unwrap();

    let indexes = collection.list_indexes().unwrap();
    assert_eq!(indexes.len(), 3);
}

#[test]
fn test_drop_index() {
    let (_temp_dir, collection) = setup_collection();

    let index_name = collection.create_index(doc! { "email": 1 }, None).unwrap();

    let indexes = collection.list_indexes().unwrap();
    assert_eq!(indexes.len(), 1);

    collection.drop_index(&index_name).unwrap();

    let indexes = collection.list_indexes().unwrap();
    assert_eq!(indexes.len(), 0);
}

#[test]
fn test_drop_all_indexes() {
    let (_temp_dir, collection) = setup_collection();

    collection.create_index(doc! { "email": 1 }, None).unwrap();
    collection.create_index(doc! { "age": 1 }, None).unwrap();
    collection.create_index(doc! { "name": 1 }, None).unwrap();

    let indexes = collection.list_indexes().unwrap();
    assert_eq!(indexes.len(), 3);

    collection.drop_index("*").unwrap();

    let indexes = collection.list_indexes().unwrap();
    assert_eq!(indexes.len(), 0);
}

#[test]
fn test_index_maintained_on_insert() {
    let (_temp_dir, collection) = setup_collection();

    collection.create_index(doc! { "email": 1 }, None).unwrap();

    collection
        .insert_one(doc! { "email": "alice@example.com", "name": "Alice" })
        .unwrap();

    let count = collection.count_documents(None).unwrap();
    assert_eq!(count, 1);
}

#[test]
fn test_index_maintained_on_update() {
    let (_temp_dir, collection) = setup_collection();

    collection
        .insert_one(doc! { "email": "alice@example.com", "age": 30 })
        .unwrap();

    collection.create_index(doc! { "email": 1 }, None).unwrap();

    collection
        .update_one(
            doc! { "email": "alice@example.com" },
            doc! { "$set": { "age": 31 } },
        )
        .unwrap();

    let doc = collection
        .find_one(doc! { "email": "alice@example.com" })
        .unwrap()
        .unwrap();
    assert_eq!(doc.get_i32("age").unwrap(), 31);
}

#[test]
fn test_index_maintained_on_delete() {
    let (_temp_dir, collection) = setup_collection();

    collection
        .insert_one(doc! { "email": "alice@example.com", "name": "Alice" })
        .unwrap();
    collection
        .insert_one(doc! { "email": "bob@example.com", "name": "Bob" })
        .unwrap();

    collection.create_index(doc! { "email": 1 }, None).unwrap();

    let result = collection
        .delete_one(doc! { "email": "alice@example.com" })
        .unwrap();
    assert_eq!(result.deleted_count, 1);

    let count = collection.count_documents(None).unwrap();
    assert_eq!(count, 1);
}

#[test]
fn test_unique_constraint_on_existing_duplicates() {
    let (_temp_dir, collection) = setup_collection();

    collection
        .insert_one(doc! { "email": "alice@example.com", "name": "Alice1" })
        .unwrap();
    collection
        .insert_one(doc! { "email": "alice@example.com", "name": "Alice2" })
        .unwrap();

    let result = collection.create_index(
        doc! { "email": 1 },
        Some(crate::index::IndexOptions {
            unique: true,
            ..Default::default()
        }),
    );
    assert!(result.is_err());
    assert!(matches!(
        result,
        Err(CollectionError::UniqueConstraintViolation(_))
    ));
}

#[test]
fn test_unique_constraint_on_update() {
    let (_temp_dir, collection) = setup_collection();

    collection
        .insert_one(doc! { "email": "alice@example.com", "name": "Alice" })
        .unwrap();
    collection
        .insert_one(doc! { "email": "bob@example.com", "name": "Bob" })
        .unwrap();

    collection
        .create_index(
            doc! { "email": 1 },
            Some(crate::index::IndexOptions {
                unique: true,
                ..Default::default()
            }),
        )
        .unwrap();

    let result = collection.update_one(
        doc! { "email": "bob@example.com" },
        doc! { "$set": { "email": "alice@example.com" } },
    );
    assert!(result.is_err());
    assert!(matches!(
        result,
        Err(CollectionError::UniqueConstraintViolation(_))
    ));
}

#[test]
fn test_create_index_empty_keys_fails() {
    let (_temp_dir, collection) = setup_collection();

    let result = collection.create_index(doc! {}, None);
    assert!(result.is_err());
    assert!(matches!(result, Err(CollectionError::InvalidIndexSpec(_))));
}

#[test]
fn test_multiple_indexes_on_same_collection() {
    let (_temp_dir, collection) = setup_collection();

    collection
        .insert_one(doc! { "email": "alice@example.com", "age": 30, "status": "active" })
        .unwrap();
    collection
        .insert_one(doc! { "email": "bob@example.com", "age": 25, "status": "inactive" })
        .unwrap();

    collection.create_index(doc! { "email": 1 }, None).unwrap();
    collection.create_index(doc! { "age": 1 }, None).unwrap();
    collection.create_index(doc! { "status": 1 }, None).unwrap();

    let indexes = collection.list_indexes().unwrap();
    assert_eq!(indexes.len(), 3);

    collection
        .insert_one(doc! { "email": "charlie@example.com", "age": 35, "status": "active" })
        .unwrap();
    let count = collection.count_documents(None).unwrap();
    assert_eq!(count, 3);
}

// ============================================================
// QUERY OPTIMIZATION TESTS (Phase 8)
// ============================================================

#[test]
fn test_query_uses_index_for_equality() {
    let (_temp_dir, collection) = setup_collection();

    collection
        .insert_one(doc! { "email": "alice@example.com", "name": "Alice" })
        .unwrap();
    collection
        .insert_one(doc! { "email": "bob@example.com", "name": "Bob" })
        .unwrap();
    collection
        .insert_one(doc! { "email": "charlie@example.com", "name": "Charlie" })
        .unwrap();

    collection.create_index(doc! { "email": 1 }, None).unwrap();

    let result = collection
        .find_one(doc! { "email": "bob@example.com" })
        .unwrap();
    assert!(result.is_some());
    assert_eq!(result.unwrap().get_str("name").unwrap(), "Bob");
}

#[test]
fn test_query_uses_index_for_range() {
    let (_temp_dir, collection) = setup_collection();

    for i in 1..=10 {
        collection
            .insert_one(doc! { "age": i * 10, "name": format!("Person{}", i) })
            .unwrap();
    }

    collection.create_index(doc! { "age": 1 }, None).unwrap();

    let results = collection.find(doc! { "age": { "$gte": 50 } }).unwrap();
    assert_eq!(results.len(), 6);
}

#[test]
fn test_query_without_index_still_works() {
    let (_temp_dir, collection) = setup_collection();

    collection
        .insert_one(doc! { "name": "Alice", "city": "NYC" })
        .unwrap();
    collection
        .insert_one(doc! { "name": "Bob", "city": "SF" })
        .unwrap();

    let results = collection.find(doc! { "city": "NYC" }).unwrap();
    assert_eq!(results.len(), 1);
    assert_eq!(results[0].get_str("name").unwrap(), "Alice");
}

#[test]
fn test_query_selects_best_index() {
    let (_temp_dir, collection) = setup_collection();

    collection
        .insert_one(doc! { "email": "alice@example.com", "age": 30 })
        .unwrap();
    collection
        .insert_one(doc! { "email": "bob@example.com", "age": 25 })
        .unwrap();

    collection.create_index(doc! { "email": 1 }, None).unwrap();
    collection.create_index(doc! { "age": 1 }, None).unwrap();

    let result = collection
        .find_one(doc! { "email": "alice@example.com" })
        .unwrap();
    assert!(result.is_some());
    assert_eq!(result.unwrap().get_i32("age").unwrap(), 30);
}

#[test]
fn test_find_with_index_returns_correct_results() {
    let (_temp_dir, collection) = setup_collection();

    for i in 1..=100 {
        collection
            .insert_one(doc! {
                "user_id": i,
                "email": format!("user{}@example.com", i),
                "score": i * 10
            })
            .unwrap();
    }

    collection.create_index(doc! { "email": 1 }, None).unwrap();
    collection.create_index(doc! { "score": 1 }, None).unwrap();

    let result = collection
        .find_one(doc! { "email": "user50@example.com" })
        .unwrap();
    assert!(result.is_some());
    assert_eq!(result.unwrap().get_i32("user_id").unwrap(), 50);

    let results = collection.find(doc! { "score": { "$gte": 900 } }).unwrap();
    assert_eq!(results.len(), 11);
}

#[test]
fn test_compound_index_query_optimization() {
    let (_temp_dir, collection) = setup_collection();

    collection
        .insert_one(doc! { "category": "books", "price": 10 })
        .unwrap();
    collection
        .insert_one(doc! { "category": "books", "price": 20 })
        .unwrap();
    collection
        .insert_one(doc! { "category": "electronics", "price": 100 })
        .unwrap();

    collection
        .create_index(doc! { "category": 1, "price": 1 }, None)
        .unwrap();

    let results = collection.find(doc! { "category": "books" }).unwrap();
    assert_eq!(results.len(), 2);
}

// ============================================================
// EXPLAIN TESTS (Phase 9)
// ============================================================

#[test]
fn test_explain_find_one_collection_scan() {
    let (_temp_dir, collection) = setup_collection();

    collection
        .insert_one(doc! { "name": "Alice", "age": 30 })
        .unwrap();
    collection
        .insert_one(doc! { "name": "Bob", "age": 25 })
        .unwrap();

    let explain = collection
        .explain_find_one(doc! { "name": "Alice" })
        .unwrap();

    assert!(matches!(
        explain.execution_plan,
        crate::explain::ExecutionPlanExplain::CollectionScan
    ));
    assert_eq!(explain.index_used, None);
    assert_eq!(explain.execution_stats.documents_examined, 2);
    assert_eq!(explain.execution_stats.documents_returned, 1);
}

#[test]
fn test_explain_find_one_with_index() {
    let (_temp_dir, collection) = setup_collection();

    collection
        .insert_one(doc! { "email": "alice@example.com", "age": 30 })
        .unwrap();
    collection
        .insert_one(doc! { "email": "bob@example.com", "age": 25 })
        .unwrap();

    collection.create_index(doc! { "email": 1 }, None).unwrap();

    let explain = collection
        .explain_find_one(doc! { "email": "alice@example.com" })
        .unwrap();

    assert!(matches!(
        explain.execution_plan,
        crate::explain::ExecutionPlanExplain::IndexSeek { .. }
    ));
    assert_eq!(explain.index_used, Some("email_1".to_string()));
    assert!(explain.execution_stats.index_entries_examined > 0);
}

#[test]
fn test_explain_find_with_range_query() {
    let (_temp_dir, collection) = setup_collection();

    for i in 1..=10 {
        collection
            .insert_one(doc! { "age": i * 10, "name": format!("Person{}", i) })
            .unwrap();
    }

    collection.create_index(doc! { "age": 1 }, None).unwrap();

    let explain = collection
        .explain_find(doc! { "age": { "$gte": 50 } })
        .unwrap();

    assert!(matches!(
        explain.execution_plan,
        crate::explain::ExecutionPlanExplain::IndexScan { .. }
    ));
    assert_eq!(explain.index_used, Some("age_1".to_string()));
    assert_eq!(explain.execution_stats.documents_returned, 6);
}

#[test]
fn test_explain_efficiency() {
    let (_temp_dir, collection) = setup_collection();

    for i in 1..=100 {
        collection
            .insert_one(
                doc! { "value": i, "category": if i % 10 == 0 { "special" } else { "normal" } },
            )
            .unwrap();
    }

    let explain = collection
        .explain_find(doc! { "category": "special" })
        .unwrap();

    assert_eq!(explain.execution_stats.documents_examined, 100);
    assert_eq!(explain.execution_stats.documents_returned, 10);
    assert_eq!(explain.efficiency(), 0.1);
    assert!(!explain.is_efficient());
}

#[test]
fn test_explain_summary() {
    let (_temp_dir, collection) = setup_collection();

    collection
        .insert_one(doc! { "email": "alice@example.com" })
        .unwrap();
    collection.create_index(doc! { "email": 1 }, None).unwrap();

    let explain = collection
        .explain_find_one(doc! { "email": "alice@example.com" })
        .unwrap();
    let summary = explain.summary();

    assert!(summary.contains("IXSEEK"));
    assert!(summary.contains("email_1"));
    assert!(summary.contains("Examined"));
    assert!(summary.contains("Returned"));
    assert!(summary.contains("Efficiency"));
}

#[test]
fn test_explain_empty_collection() {
    let (_temp_dir, collection) = setup_collection();

    let explain = collection.explain_find(doc! { "field": "value" }).unwrap();

    assert_eq!(explain.execution_stats.documents_examined, 0);
    assert_eq!(explain.execution_stats.documents_returned, 0);
    assert_eq!(explain.efficiency(), 1.0);
}

#[test]
fn test_explain_with_multiple_indexes() {
    let (_temp_dir, collection) = setup_collection();

    collection
        .insert_one(doc! { "email": "alice@example.com", "age": 30 })
        .unwrap();

    collection.create_index(doc! { "email": 1 }, None).unwrap();
    collection.create_index(doc! { "age": 1 }, None).unwrap();

    let explain = collection
        .explain_find_one(doc! { "email": "alice@example.com" })
        .unwrap();

    assert_eq!(explain.index_used, Some("email_1".to_string()));
    assert!(matches!(
        explain.execution_plan,
        crate::explain::ExecutionPlanExplain::IndexSeek { .. }
    ));
}

// ============================================================
// INDEX-AWARE AGGREGATION TESTS
// ============================================================

#[test]
fn test_aggregate_uses_index_for_leading_match() {
    let (_temp_dir, collection) = setup_collection();

    for i in 0..20 {
        collection
            .insert_one(doc! { "status": if i % 2 == 0 { "active" } else { "inactive" }, "val": i })
            .unwrap();
    }

    collection.create_index(doc! { "status": 1 }, None).unwrap();

    let explain = collection
        .explain_aggregate(vec![
            doc! { "$match": { "status": "active" } },
            doc! { "$sort": { "val": 1 } },
        ])
        .unwrap();

    assert!(matches!(
        explain.execution_plan,
        crate::explain::ExecutionPlanExplain::IndexSeek { .. }
    ));
    assert_eq!(explain.index_used, Some("status_1".to_string()));
}

#[test]
fn test_aggregate_merges_consecutive_matches() {
    let (_temp_dir, collection) = setup_collection();

    collection
        .insert_one(doc! { "status": "active", "age": 30 })
        .unwrap();
    collection
        .insert_one(doc! { "status": "active", "age": 15 })
        .unwrap();
    collection
        .insert_one(doc! { "status": "inactive", "age": 40 })
        .unwrap();

    collection.create_index(doc! { "status": 1 }, None).unwrap();

    let results = collection
        .aggregate(vec![
            doc! { "$match": { "status": "active" } },
            doc! { "$match": { "age": { "$gte": 18 } } },
            doc! { "$count": "total" },
        ])
        .unwrap();

    assert_eq!(results.len(), 1);
    assert_eq!(results[0].get_i32("total").unwrap(), 1);
}

#[test]
fn test_aggregate_no_match_still_works() {
    let (_temp_dir, collection) = setup_collection();

    collection.insert_one(doc! { "x": 1 }).unwrap();
    collection.insert_one(doc! { "x": 2 }).unwrap();
    collection.insert_one(doc! { "x": 3 }).unwrap();

    let results = collection
        .aggregate(vec![doc! { "$sort": { "x": -1 } }, doc! { "$limit": 2 }])
        .unwrap();

    assert_eq!(results.len(), 2);
    assert_eq!(results[0].get_i32("x").unwrap(), 3);

    let explain = collection
        .explain_aggregate(vec![doc! { "$sort": { "x": -1 } }])
        .unwrap();
    assert!(matches!(
        explain.execution_plan,
        crate::explain::ExecutionPlanExplain::CollectionScan
    ));
}

#[test]
fn test_aggregate_match_not_first_stage_not_pushed_down() {
    let (_temp_dir, collection) = setup_collection();

    collection
        .insert_one(doc! { "dept": "eng", "salary": 100 })
        .unwrap();
    collection
        .insert_one(doc! { "dept": "eng", "salary": 200 })
        .unwrap();
    collection
        .insert_one(doc! { "dept": "hr", "salary": 150 })
        .unwrap();

    collection.create_index(doc! { "dept": 1 }, None).unwrap();

    let explain = collection
        .explain_aggregate(vec![
            doc! { "$group": { "_id": "$dept", "total": { "$sum": "$salary" } } },
            doc! { "$match": { "total": { "$gte": 200 } } },
        ])
        .unwrap();

    assert!(matches!(
        explain.execution_plan,
        crate::explain::ExecutionPlanExplain::CollectionScan
    ));
    assert_eq!(explain.index_used, None);
}

#[test]
fn test_aggregate_with_index_produces_correct_results() {
    let (_temp_dir, collection) = setup_collection();

    for i in 1..=50 {
        collection
            .insert_one(doc! {
                "category": if i % 3 == 0 { "a" } else if i % 3 == 1 { "b" } else { "c" },
                "value": i
            })
            .unwrap();
    }

    collection
        .create_index(doc! { "category": 1 }, None)
        .unwrap();

    let results = collection
        .aggregate(vec![
            doc! { "$match": { "category": "a" } },
            doc! { "$group": { "_id": bson::Bson::Null, "total": { "$sum": "$value" } } },
        ])
        .unwrap();

    assert_eq!(results.len(), 1);
    let expected_sum: i32 = (1..=50).filter(|i| i % 3 == 0).sum();
    assert_eq!(results[0].get_i64("total").unwrap(), expected_sum as i64);
}

#[test]
fn test_aggregate_range_match_uses_index() {
    let (_temp_dir, collection) = setup_collection();

    for i in 0..30 {
        collection.insert_one(doc! { "score": i * 10 }).unwrap();
    }

    collection.create_index(doc! { "score": 1 }, None).unwrap();

    let explain = collection
        .explain_aggregate(vec![
            doc! { "$match": { "score": { "$gte": 200 } } },
            doc! { "$count": "high_scorers" },
        ])
        .unwrap();

    assert!(matches!(
        explain.execution_plan,
        crate::explain::ExecutionPlanExplain::IndexScan { .. }
    ));
    assert_eq!(explain.index_used, Some("score_1".to_string()));
}

#[test]
fn test_explain_plan_reason() {
    let (_temp_dir, collection) = setup_collection();

    let explain = collection.explain_find(doc! { "field": "value" }).unwrap();
    assert!(explain.plan_reason.contains("No suitable index") || explain.plan_reason.len() > 0);

    collection
        .insert_one(doc! { "email": "test@example.com" })
        .unwrap();
    collection.create_index(doc! { "email": 1 }, None).unwrap();

    let explain = collection
        .explain_find_one(doc! { "email": "test@example.com" })
        .unwrap();
    assert!(explain.plan_reason.contains("Equality") || explain.plan_reason.contains("email"));
}

// ============================================================
// FIND_ITER TESTS
// ============================================================

#[test]
fn test_find_iter_collection_scan() {
    let (_td, col) = setup_collection();
    col.insert_one(doc! { "name": "Alice", "age": 30 }).unwrap();
    col.insert_one(doc! { "name": "Bob", "age": 25 }).unwrap();
    col.insert_one(doc! { "name": "Charlie", "age": 35 })
        .unwrap();

    let results: Vec<_> = col
        .find_iter(doc! { "age": { "$gte": 30 } })
        .unwrap()
        .collect::<Result<Vec<_>, _>>()
        .unwrap();
    assert_eq!(results.len(), 2);
}

#[test]
fn test_find_iter_with_index() {
    let (_td, col) = setup_collection();
    col.insert_one(doc! { "email": "a@b.c", "name": "Alice" })
        .unwrap();
    col.insert_one(doc! { "email": "b@b.c", "name": "Bob" })
        .unwrap();
    col.create_index(doc! { "email": 1 }, None).unwrap();

    let results: Vec<_> = col
        .find_iter(doc! { "email": "a@b.c" })
        .unwrap()
        .collect::<Result<Vec<_>, _>>()
        .unwrap();
    assert_eq!(results.len(), 1);
    assert_eq!(results[0].get_str("name").unwrap(), "Alice");
}

#[test]
fn test_find_iter_empty_collection() {
    let (_td, col) = setup_collection();
    let results: Vec<_> = col
        .find_iter(doc! {})
        .unwrap()
        .collect::<Result<Vec<_>, _>>()
        .unwrap();
    assert!(results.is_empty());
}

#[test]
fn test_find_iter_lazy_take() {
    let (_td, col) = setup_collection();
    for i in 0..100 {
        col.insert_one(doc! { "n": i }).unwrap();
    }
    let results: Vec<_> = col
        .find_iter(doc! {})
        .unwrap()
        .take(5)
        .collect::<Result<Vec<_>, _>>()
        .unwrap();
    assert_eq!(results.len(), 5);
}

// ============================================================
// TRANSACTION TESTS
// ============================================================

#[test]
fn test_single_collection_transaction_commit() {
    let (_td, col) = setup_collection();
    col.with_transaction(|| {
        col.insert_one(doc! { "x": 1 })?;
        col.insert_one(doc! { "x": 2 })?;
        Ok(())
    })
    .unwrap();
    assert_eq!(col.count_documents(None).unwrap(), 2);
}

#[test]
fn test_single_collection_transaction_rollback() {
    let (_td, col) = setup_collection();
    col.insert_one(doc! { "x": 0 }).unwrap();
    let result: Result<(), _> = col.with_transaction(|| {
        col.insert_one(doc! { "x": 1 })?;
        Err(CollectionError::Other("deliberate abort".into()))
    });
    assert!(result.is_err());
    assert_eq!(col.count_documents(None).unwrap(), 1);
}
