if (name.startsWith("impression")) {
    printableMeshes[child.name] = child;

    // Forcer une couleur de base si aucune texture
    if (!child.material.map) {
        child.material = new THREE.MeshBasicMaterial({
            color: 0xffffff,   // blanc par défaut
            transparent: false,
            opacity: 1.0
        });
    }

    child.material.userData.baseColor = child.material.color.getHex();
    child.material.needsUpdate = true;
}
