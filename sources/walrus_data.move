module walrus_data::walrus_data;

use sui::bcs;

//=== Enums ===

/// Represents either a standalone Walrus blob or a patch within a quilt.
public enum WalrusData has copy, drop, store {
    /// A standalone Walrus blob. Fields: blob_id.
    Blob(u256),
    /// A patch within a Walrus quilt. Fields: quilt_id, version, start_index, end_index.
    QuiltPatch(u256, u8, u16, u16),
}

//=== Errors ===

const ENotBlob: u64 = 0;
const ENotQuiltPatch: u64 = 1;

//=== Public Functions ===

/// Creates a WalrusData referencing a standalone blob.
public fun new_blob(blob_id: u256): WalrusData {
    WalrusData::Blob(blob_id)
}

/// Creates a WalrusData referencing a patch within a quilt.
public fun new_quilt_patch(
    quilt_id: u256,
    version: u8,
    start_index: u16,
    end_index: u16,
): WalrusData {
    WalrusData::QuiltPatch(quilt_id, version, start_index, end_index)
}

//=== Public View Functions ===

/// Returns the blob ID for a standalone blob.
/// Aborts if this is a quilt patch.
public fun blob_id(self: &WalrusData): u256 {
    match (self) {
        WalrusData::Blob(blob_id) => *blob_id,
        _ => abort ENotBlob,
    }
}

/// Returns the quilt ID.
/// Aborts if this is a standalone blob.
public fun quilt_id(self: &WalrusData): u256 {
    match (self) {
        WalrusData::QuiltPatch(quilt_id, ..) => *quilt_id,
        _ => abort ENotQuiltPatch,
    }
}

/// Returns the quilt patch version.
/// Aborts if this is a standalone blob.
public fun quilt_patch_version(self: &WalrusData): u8 {
    match (self) {
        WalrusData::QuiltPatch(_, version, ..) => *version,
        _ => abort ENotQuiltPatch,
    }
}

/// Returns the quilt patch start index.
/// Aborts if this is a standalone blob.
public fun quilt_patch_start_index(self: &WalrusData): u16 {
    match (self) {
        WalrusData::QuiltPatch(_, _, start_index, _) => *start_index,
        _ => abort ENotQuiltPatch,
    }
}

/// Returns the quilt patch end index.
/// Aborts if this is a standalone blob.
public fun quilt_patch_end_index(self: &WalrusData): u16 {
    match (self) {
        WalrusData::QuiltPatch(_, _, _, end_index) => *end_index,
        _ => abort ENotQuiltPatch,
    }
}

/// Returns the quilt patch ID as raw bytes (37 bytes).
/// Layout: quilt_id (32 bytes LE) + version (1 byte) + start_index (2 bytes LE) + end_index (2 bytes LE).
/// Aborts if this is a standalone blob.
public fun quilt_patch_id(self: &WalrusData): vector<u8> {
    match (self) {
        WalrusData::QuiltPatch(quilt_id, version, start_index, end_index) => {
            let mut bytes = bcs::to_bytes(quilt_id); // 32 bytes LE
            bytes.push_back(*version);
            bytes.append(bcs::to_bytes(start_index)); // 2 bytes LE
            bytes.append(bcs::to_bytes(end_index)); // 2 bytes LE
            bytes
        },
        _ => abort ENotQuiltPatch,
    }
}

/// Returns true if this is a standalone blob.
public fun is_blob(self: &WalrusData): bool {
    match (self) {
        WalrusData::Blob(_) => true,
        _ => false,
    }
}

/// Returns true if this is a quilt patch.
public fun is_quilt_patch(self: &WalrusData): bool {
    match (self) {
        WalrusData::QuiltPatch(..) => true,
        _ => false,
    }
}

//=== Public Assert Functions ===

public fun assert_is_blob(self: &WalrusData) {
    assert!(self.is_blob(), ENotBlob);
}

public fun assert_is_quilt_patch(self: &WalrusData) {
    assert!(self.is_quilt_patch(), ENotQuiltPatch);
}
