import Foundation
import SwiftData

enum ItemStatus: String, Codable {
    case toBuy
    case inPantry
}

@Model
final class GroceryItem {
    var name: String = ""
    var status: ItemStatus = ItemStatus.toBuy
    var createdAt: Date = Date.now
    var updatedAt: Date = Date.now

    init(name: String, status: ItemStatus = .toBuy) {
        self.name = name
        self.status = status
        self.createdAt = .now
        self.updatedAt = .now
    }
}
