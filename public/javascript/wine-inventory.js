
// ==========================
// WINE INVENTORY DATA
// ==========================

let wines = [];


// ==========================
// LOAD WINES FROM MARIADB
// ==========================

async function loadWines() {

    try {

        const response = await fetch('/api/wines');

        if (!response.ok) {
            throw new Error('Failed to retrieve wines from database');
        }

        const databaseWines = await response.json();

        wines = databaseWines;

        console.log('Wines loaded from MariaDB:', wines);

        updateStatistics();
        displayWineCards();
        displayWineTable(getFilteredWines());

    } catch (error) {

        console.error('Error loading wines:', error);

        document.getElementById("form-message").textContent =
            "Unable to load inventory from database.";

    }
}


// ==========================
// INVENTORY STATISTICS
// ==========================

function updateStatistics() {

    const totalBottles = wines.reduce(
        (total, wine) => total + Number(wine.quantity || 0), 0
    );

    const totalProducers = new Set(
        wines.map(wine => wine.producer)
    ).size;

    const totalVarietals = new Set(
        wines.map(wine => wine.varietal).filter(Boolean)
    ).size;

    document.getElementById("total-bottles").textContent = totalBottles;

    document.getElementById("total-producers").textContent = totalProducers;

    document.getElementById("total-varietals").textContent = totalVarietals;
}


// ==========================
// DISPLAY WINE CARDS
// ==========================

function displayWineCards() {

    const wineCards = document.getElementById("wine-cards");

    wineCards.innerHTML = "";

    const recentWines = wines.slice(0, 3);

    recentWines.forEach(wine => {

        const card = document.createElement("div");

        card.className = "wine-card";

        const producer = document.createElement("h4");
        producer.textContent = wine.producer;

        const name = document.createElement("p");
        name.textContent = wine.wineName;

        const vintage = document.createElement("p");
        vintage.textContent = `Vintage: ${wine.vintage || "N/A"}`;

        const region = document.createElement("p");
        region.textContent = `Region: ${wine.region || "N/A"}`;

        const quantity = document.createElement("p");
        quantity.textContent = `Bottles: ${wine.quantity}`;

        card.append(
            producer,
            name,
            vintage,
            region,
            quantity
        );

        wineCards.appendChild(card);

    });
}


// ==========================
// SEARCH INVENTORY
// ==========================

function getFilteredWines() {

    const searchTerm = document.getElementById("wine-search").value.toLowerCase();

    return wines.filter(wine => {

        return (
            (wine.producer || "").toLowerCase().includes(searchTerm) ||
            (wine.wineName || "").toLowerCase().includes(searchTerm) ||
            (wine.varietal || "").toLowerCase().includes(searchTerm) ||
            (wine.region || "").toLowerCase().includes(searchTerm)
        );

    });
}


// ==========================
// DISPLAY WINE TABLE
// ==========================

function displayWineTable(wineList) {

    const tableBody = document.getElementById("wine-table-body");

    tableBody.innerHTML = "";

    wineList.forEach(wine => {

        const row = document.createElement("tr");

        const values = [
            wine.producer,
            wine.wineName,
            wine.vintage || "N/A",
            wine.varietal || "N/A",
            wine.region || "N/A",
            wine.quantity,
            `$${Number(wine.price || 0).toFixed(2)}`
        ];

        values.forEach(value => {

            const cell = document.createElement("td");

            cell.textContent = value ?? "";

            row.appendChild(cell);

        });

        // ACTIONS COLUMN
        const actionsCell = document.createElement("td");

        // EDIT BUTTON
        const editButton = document.createElement("button");

        editButton.type = "button";
        editButton.textContent = "Edit";

        editButton.addEventListener("click", () => {
            editWine(wine.id);
        });

        // DELETE BUTTON
        const deleteButton = document.createElement("button");

        deleteButton.type = "button";
        deleteButton.textContent = "Delete";

        deleteButton.addEventListener("click", () => {
            deleteWine(wine.id);
        });

        actionsCell.appendChild(editButton);
        actionsCell.appendChild(deleteButton);

        row.appendChild(actionsCell);

        tableBody.appendChild(row);

    });
}


// ==========================
// ADD WINE TO INVENTORY
// ==========================

async function handleAddWine(event) {

    event.preventDefault();

    const newWine = {

        producer: document.getElementById("producer").value.trim(),

        wineName: document.getElementById("wine-name").value.trim(),

        vintage: document.getElementById("vintage").value || null,

        varietal: document.getElementById("varietal").value.trim(),

        region: document.getElementById("region").value.trim(),

        quantity: Number(document.getElementById("quantity").value),

        price: Number(document.getElementById("price").value)

    };

    try {

        const response = await fetch('/api/wines', {

            method: 'POST',

            headers: {
                'Content-Type': 'application/json'
            },

            body: JSON.stringify(newWine)

        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Failed to save wine');
        }

        await loadWines();

        document.getElementById("form-message").textContent =
            "Wine successfully saved to your collection!";

        event.target.reset();

    } catch (error) {

        console.error("Error adding wine:", error);

        document.getElementById("form-message").textContent =
            "Unable to save wine. Please try again.";

    }

}


// ==========================
// EDIT WINE
// ==========================

function editWine(id) {

    // Find selected wine in our database-loaded array
    const wine = wines.find(w => String(w.id) === String(id));

    if (!wine) {
        alert("Wine not found.");
        return;
    }

    // Populate edit form
    document.getElementById("edit-wine-id").value = wine.id;

    document.getElementById("edit-producer").value = wine.producer || "";

    document.getElementById("edit-wine-name").value = wine.wineName || "";

    document.getElementById("edit-vintage").value = wine.vintage || "";

    document.getElementById("edit-varietal").value = wine.varietal || "";

    document.getElementById("edit-region").value = wine.region || "";

    document.getElementById("edit-quantity").value = wine.quantity ?? 0;

    document.getElementById("edit-price").value = wine.price ?? 0;

    // Show edit form
    document.getElementById("edit-wine-container").style.display = "block";

    // Scroll to edit form
    document.getElementById("edit-wine-container").scrollIntoView({
        behavior: "smooth"
    });

}


// ==========================
// SAVE EDITED WINE
// ==========================

async function handleEditWine(event) {

    event.preventDefault();

    const id = document.getElementById("edit-wine-id").value;

    const updatedWine = {

        producer: document.getElementById("edit-producer").value.trim(),

        wineName: document.getElementById("edit-wine-name").value.trim(),

        vintage: document.getElementById("edit-vintage").value || null,

        varietal: document.getElementById("edit-varietal").value.trim(),

        region: document.getElementById("edit-region").value.trim(),

        quantity: Number(document.getElementById("edit-quantity").value),

        price: Number(document.getElementById("edit-price").value)

    };

    try {

        const response = await fetch(`/api/wines/${id}`, {

            method: "PUT",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(updatedWine)

        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Unable to update wine");
        }

        // Hide edit form
        document.getElementById("edit-wine-container").style.display = "none";

        // Reload actual database records
        await loadWines();

        document.getElementById("form-message").textContent =
            "Wine successfully updated!";

    } catch (error) {

        console.error("Error updating wine:", error);

        alert("Unable to update wine. Check the console for details.");

    }

}


// ==========================
// CANCEL EDIT
// ==========================

function cancelEdit() {

    document.getElementById("edit-wine-container").style.display = "none";

    document.getElementById("edit-wine-form").reset();

}


// ==========================
// DELETE WINE
// ==========================

async function deleteWine(id) {

    const confirmed = confirm(
        "Are you sure you want to delete this wine from your inventory?"
    );

    if (!confirmed) {
        return;
    }

    try {

        const response = await fetch(`/api/wines/${id}`, {

            method: "DELETE"

        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Unable to delete wine");
        }

        // Refresh inventory from MariaDB
        await loadWines();

        document.getElementById("form-message").textContent =
            "Wine successfully deleted.";

    } catch (error) {

        console.error("Error deleting wine:", error);

        alert("Unable to delete wine. Check the console for details.");

    }

}


// ==========================
// INITIALIZE INVENTORY
// ==========================

function initializeInventory() {

    // Search event listener
    document.getElementById("wine-search").addEventListener("input", () => {

        displayWineTable(getFilteredWines());

    });

    // Add wine event listener
    document.getElementById("add-wine-form").addEventListener(
        "submit",
        handleAddWine
    );

    // Edit wine event listener
    document.getElementById("edit-wine-form").addEventListener(
        "submit",
        handleEditWine
    );

    // Cancel edit button
    document.getElementById("cancel-edit").addEventListener(
        "click",
        cancelEdit
    );

    // Load inventory from MariaDB
    loadWines();

}


// ==========================
// START INVENTORY
// ==========================

if (document.readyState === "loading") {

    document.addEventListener("DOMContentLoaded", initializeInventory);

} else {

    initializeInventory();

}
