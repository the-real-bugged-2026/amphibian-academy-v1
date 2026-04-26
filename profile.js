let equippedHat  = "0";   // "0" means none, "1" means hat 1, etc.
let equippedItem = "0";   // "0" means none, "1" means item 1, etc.

// --- Drag start: store what's being dragged ---
document.querySelectorAll("[draggable='true']").forEach(el => {
    el.addEventListener("dragstart", e => {
        const type = el.dataset.type;
        const id   = el.dataset.id || "reset";
        e.dataTransfer.setData("text/plain", JSON.stringify({ type, id }));
    });
});

// --- Drop onto frog ---
function handleDrop(e) {
    e.preventDefault();
    const { type, id } = JSON.parse(e.dataTransfer.getData("text/plain"));

    if (type === "reset") {
        equippedHat  = "0";
        equippedItem = "0";
    } else if (type === "hat") {
        // toggle off if same hat dropped again
        equippedHat = equippedHat === id ? "0" : id;
    } else if (type === "item") {
        // toggle off if same item dropped again
        equippedItem = equippedItem === id ? "0" : id;
    }

    updateFrog();
}

// --- Build filename and swap sprite ---
function updateFrog() {
    // filename format: {hat}{item}.png
    // 00 = naked, 01 = item only, 10 = hat only, 11 = hat + item
    const hatPart  = equippedHat  === "0" ? "0" : equippedHat;
    const itemPart = equippedItem === "0" ? "0" : equippedItem;
    const filename = `frog_sprites/${hatPart}${itemPart}.png`;

    document.getElementById("frog-display").src = filename;
}