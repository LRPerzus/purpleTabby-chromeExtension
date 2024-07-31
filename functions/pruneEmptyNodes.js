export function pruneEmptyNodes(json) {
    if (json === null) {
        return null;
    }

    if ((json.role === "none" && json.name === "") && (!json.children || json.children.length === 0)) {
        return null;
    }

    if (json.children) {
        json.children.forEach((child, index) => {
            const result = pruneEmptyNodes(child);
            if (result === null && json.children) {
                json.children.splice(index, 1);
                index--; // Adjust index after removal
            }
        });
    }

    return json;
}