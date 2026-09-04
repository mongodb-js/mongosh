use bson::doc;
use smongo_engine::database::Database;
use smongo_engine::planner::{plan_query_with_projection, ExecutionPlan};

#[test]
fn test_covering_index_detection() {
    // Create in-memory database
    let db = Database::from_backend(
        smongo_engine::storage::MemBackend::new(),
        "test_covering_db",
        None,
    );
    let coll = db.collection("sensors").unwrap();

    // Create compound index on (device_id, timestamp, value)
    coll.create_index(doc! { "device_id": 1, "timestamp": 1, "value": 1 }, None)
        .unwrap();

    let indexes = coll.list_indexes().unwrap();

    // Test 1: Query with projection covered by index
    let query = doc! { "device_id": "sensor_123" };
    let projection = doc! { "timestamp": 1, "value": 1, "_id": 0 };

    let plan = plan_query_with_projection(&query, &indexes, Some(&projection));

    println!("Plan: {:?}", plan);
    assert!(
        matches!(plan.execution_plan, ExecutionPlan::CoveringIndexScan { .. }),
        "Should use covering index scan"
    );
    assert_eq!(
        plan.estimated_cost, 5,
        "Covering index should have lower cost"
    );

    // Test 2: Query without projection - should NOT be covering
    let plan_no_proj = plan_query_with_projection(&query, &indexes, None);
    assert!(
        !matches!(
            plan_no_proj.execution_plan,
            ExecutionPlan::CoveringIndexScan { .. }
        ),
        "Without projection, should not be covering"
    );

    // Test 3: Projection includes field not in index - should NOT be covering
    let projection_extra = doc! { "timestamp": 1, "value": 1, "extra_field": 1, "_id": 0 };
    let plan_extra = plan_query_with_projection(&query, &indexes, Some(&projection_extra));
    assert!(
        !matches!(
            plan_extra.execution_plan,
            ExecutionPlan::CoveringIndexScan { .. }
        ),
        "With non-indexed field, should not be covering"
    );
}

#[test]
fn test_covering_index_execution() {
    // Create in-memory database
    let db = Database::from_backend(
        smongo_engine::storage::MemBackend::new(),
        "test_covering_exec",
        None,
    );
    let coll = db.collection("iot_readings").unwrap();

    // Create compound index
    coll.create_index(doc! { "sensor_type": 1, "zone": 1, "timestamp": 1 }, None)
        .unwrap();

    // Insert test data
    coll.insert_one(doc! {
        "_id": "doc1",
        "sensor_type": "temperature",
        "zone": "warehouse_A",
        "timestamp": 1000,
        "extra_data": "should not be returned"
    })
    .unwrap();

    coll.insert_one(doc! {
        "_id": "doc2",
        "sensor_type": "temperature",
        "zone": "warehouse_A",
        "timestamp": 2000,
        "extra_data": "should not be returned"
    })
    .unwrap();

    coll.insert_one(doc! {
        "_id": "doc3",
        "sensor_type": "humidity",
        "zone": "warehouse_A",
        "timestamp": 1500,
        "extra_data": "should not be returned"
    })
    .unwrap();

    // Query with covering projection
    let indexes = coll.list_indexes().unwrap();
    let query = doc! { "sensor_type": "temperature" };
    let projection = doc! { "zone": 1, "timestamp": 1, "_id": 0 };

    let plan = plan_query_with_projection(&query, &indexes, Some(&projection));

    // Verify it's a covering plan
    if let ExecutionPlan::CoveringIndexScan { .. } = plan.execution_plan {
        println!("✓ Using covering index scan!");
    } else {
        panic!(
            "Expected CoveringIndexScan but got {:?}",
            plan.execution_plan
        );
    }

    // Execute the query
    let results = coll.execute_plan(&plan.execution_plan, &query).unwrap();

    assert_eq!(results.len(), 2, "Should return 2 temperature readings");

    // Verify results only contain projected fields
    for doc in &results {
        assert!(doc.contains_key("zone"), "Should have zone");
        assert!(doc.contains_key("timestamp"), "Should have timestamp");
        assert!(!doc.contains_key("_id"), "_id should be excluded");
        assert!(
            !doc.contains_key("extra_data"),
            "Should not fetch non-indexed fields"
        );
        assert!(
            !doc.contains_key("sensor_type"),
            "sensor_type not in projection"
        );
    }

    // Verify correct values
    assert_eq!(results[0].get_str("zone").unwrap(), "warehouse_A");
    let ts = results[0].get_i32("timestamp").unwrap();
    assert!(ts == 1000 || ts == 2000);
}
