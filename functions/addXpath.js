export function addXPath(json, xpath = '', notEmpty = [], first = false, allpaths = []) {
    if (json === null) {
        console.log("JSON is null, returning");
        return;
    }

    console.log("Adding path:", xpath);
    allpaths.push(xpath);

    if (json.name !== "" && !first) {
        console.log("Setting XPath for:", json.name, " to ", xpath);
        json.xpath = xpath;
        notEmpty.push(json);
    }
    if (json.children) {
        json.children.forEach((child, index) => {
            let newXPath = `${xpath}.children[${index}]`;
            addXPath(child, newXPath, notEmpty, false, allpaths);
        });
    }
}
