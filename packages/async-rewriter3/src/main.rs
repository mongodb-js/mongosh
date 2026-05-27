use async_rewriter3::{async_rewrite, DebugLevel};
use std::io::Read;

fn main() {
    let mut input = String::new();
    std::io::stdin().read_to_string(&mut input).unwrap();
    println!(
        "{}",
        async_rewrite(input.as_str(), DebugLevel::None).unwrap()
    );
}
