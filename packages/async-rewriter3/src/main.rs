use async_rewriter3::async_rewrite;
use std::io::Read;

fn main() {
    let mut input = String::new();

    //std::fs::File::open("../../node_modules/sinon/pkg/sinon.js").unwrap()
    std::io::stdin().read_to_string(&mut input).unwrap();
    println!("{}", async_rewrite(input.as_str(), false).unwrap());
}
