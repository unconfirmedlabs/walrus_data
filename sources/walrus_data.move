module walrus_data::walrus_data;

//=== Structs ===

public struct WalrusData(Option<u256>, u256) has copy, drop, store;

//=== Public Functions ===

public fun new_with_quilt(quilt_id: u256, blob_id: u256): WalrusData {
    WalrusData(option::some(quilt_id), blob_id)
}

public fun new_without_quilt(blob_id: u256): WalrusData {
    WalrusData(option::none(), blob_id)
}

//=== Public View Functions ===

public fun quilt_id(data: &WalrusData): Option<u256> {
    data.0
}

public fun blob_id(data: &WalrusData): u256 {
    data.1
}
