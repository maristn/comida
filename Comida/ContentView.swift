import SwiftUI
import SwiftData

struct ContentView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \GroceryItem.createdAt, order: .reverse) private var items: [GroceryItem]

    @State private var newItemName = ""

    private var toBuyItems: [GroceryItem] {
        items.filter { $0.status == .toBuy }
    }

    private var pantryItems: [GroceryItem] {
        items.filter { $0.status == .inPantry }
    }

    var body: some View {
        NavigationStack {
            List {
                Section("A comprar") {
                    if toBuyItems.isEmpty {
                        Text("Nada para comprar")
                            .foregroundStyle(.secondary)
                    }
                    ForEach(toBuyItems) { item in
                        ItemRow(item: item) {
                            move(item, to: .inPantry)
                        }
                    }
                    .onDelete { offsets in
                        delete(toBuyItems, at: offsets)
                    }
                }

                Section("Despensa") {
                    if pantryItems.isEmpty {
                        Text("Despensa vazia")
                            .foregroundStyle(.secondary)
                    }
                    ForEach(pantryItems) { item in
                        ItemRow(item: item) {
                            move(item, to: .toBuy)
                        }
                    }
                    .onDelete { offsets in
                        delete(pantryItems, at: offsets)
                    }
                }
            }
            .navigationTitle("Comida")
            .safeAreaInset(edge: .bottom) {
                addItemBar
            }
        }
    }

    private var addItemBar: some View {
        HStack(spacing: 12) {
            TextField("Eu preciso de...", text: $newItemName)
                .textFieldStyle(.roundedBorder)
                .onSubmit(addItem)

            Button(action: addItem) {
                Image(systemName: "plus.circle.fill")
                    .font(.system(size: 30))
            }
            .disabled(newItemName.trimmingCharacters(in: .whitespaces).isEmpty)
        }
        .padding()
        .background(.bar)
    }

    private func addItem() {
        let trimmed = newItemName.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return }
        modelContext.insert(GroceryItem(name: trimmed))
        newItemName = ""
    }

    private func move(_ item: GroceryItem, to status: ItemStatus) {
        item.status = status
        item.updatedAt = .now
    }

    private func delete(_ list: [GroceryItem], at offsets: IndexSet) {
        for index in offsets {
            modelContext.delete(list[index])
        }
    }
}

private struct ItemRow: View {
    let item: GroceryItem
    let onToggle: () -> Void

    var body: some View {
        HStack {
            Button(action: onToggle) {
                Image(systemName: item.status == .toBuy ? "circle" : "checkmark.circle.fill")
                    .foregroundStyle(item.status == .toBuy ? Color.secondary : Color.green)
            }
            .buttonStyle(.plain)

            Text(item.name)
        }
    }
}

#Preview {
    ContentView()
        .modelContainer(for: GroceryItem.self, inMemory: true)
}
