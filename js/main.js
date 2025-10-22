// Importamos los módulos necesarios de Three.js desde el CDN
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
// CORRECCIÓN: Eliminamos la importación de CapsuleGeometry, no existe en esta versión
// import { CapsuleGeometry } from 'three/addons/geometries/CapsuleGeometry.js';


// --- 1. CONFIGURACIÓN DE LA ESCENA (Reemplazo de la "Escena" de Unity) ---

let scene, camera, renderer, controls;
let currentModel = null;
const productPool = {}; // "Object Pool" para los modelos

// Lista de productos (reemplazo de tu ScriptableObject Database)
// Usamos placeholders (formas básicas) hasta que carguemos los .glb
const productDatabase = [
    { id: 'cubo', name: 'Cubo', type: 'Box' },
    { id: 'esfera', name: 'Esfera', type: 'Sphere' },
    { id: 'cilindro', name: 'Cilindro', type: 'Cylinder' },
    { id: 'dona', name: 'Dona', type: 'Torus' },
    { id: 'cono', name: 'Cono', type: 'Cone' },
    // CORRECCIÓN: Eliminamos la cápsula de la base de datos
    // { id: 'capsula', name: 'Cápsula', type: 'Capsule' },
];

// Función principal de inicialización
function init() {
    // Escena
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x333333); // Fondo gris oscuro

    // Cámara (similar a la Cámara de Unity)
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    // Renderer (el que "dibuja" en el <canvas>)
    const canvas = document.getElementById('canvas-3d');
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    // Luces (para que se vean los modelos)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);

    // Controles (Reemplazo de tu InputManager + Interactor)
    // Esto nos da la rotación y zoom del objeto con mouse/dedos
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // Efecto de "desaceleración" suave
    controls.enablePan = false; // Deshabilitamos el paneo (arrastrar)

    // --- 2. LÓGICA DE LA APP (Reemplazo de tus "Managers") ---
    
    createProductPool();
    createProductButtons();

    // Mostramos el primer producto por defecto
    displayProduct(productDatabase[0]);

    // Bucle de render (similar al Update() de Unity)
    animate();

    // Ajustar la escena si cambia el tamaño de la ventana
    window.addEventListener('resize', onWindowResize);
}

// Crea el "pool" de objetos al inicio
function createProductPool() {
    const material = new THREE.MeshStandardMaterial({ color: 0x007bff });

    productDatabase.forEach(product => {
        let geometry;
        switch (product.type) {
            case 'Box':
                geometry = new THREE.BoxGeometry(2, 2, 2);
                break;
            case 'Sphere':
                geometry = new THREE.SphereGeometry(1.5, 32, 32);
                break;
            case 'Cylinder':
                geometry = new THREE.CylinderGeometry(1, 1, 2, 32);
                break;
            case 'Torus':
                geometry = new THREE.TorusGeometry(1, 0.4, 16, 100);
                break;
            case 'Cone':
                geometry = new THREE.ConeGeometry(1, 2, 32);
                break;
            // CORRECCIÓN: Eliminamos el "case" de la cápsula
            // case 'Capsule':
            //     geometry = new CapsuleGeometry(1, 1, 4, 8);
            //     break;
            default:
                geometry = new THREE.BoxGeometry(2, 2, 2);
        }
        
        const model = new THREE.Mesh(geometry, material);
        model.visible = false; // Oculto al inicio
        scene.add(model);
        productPool[product.id] = model;
    });
}

// Crea los botones en la UI (HTML)
function createProductButtons() {
    const container = document.getElementById('buttonContainer');
    productDatabase.forEach(product => {
        const button = document.createElement('button');
        button.className = 'product-button';
        button.innerText = product.name;
        
        // Añadimos el "listener" (reemplazo del OnClick() de Unity)
        button.addEventListener('click', () => {
            displayProduct(product);
        });
        
        container.appendChild(button);
    });
}

// Muestra un producto (activándolo del pool)
function displayProduct(productData) {
    // 1. Oculta el modelo actual (si hay uno)
    if (currentModel) {
        currentModel.visible = false;
    }

    // 2. Busca y muestra el nuevo modelo
    const modelToShow = productPool[productData.id];
    if (modelToShow) {
        modelToShow.visible = true;
        currentModel = modelToShow;

        // 3. Resetea los controles y la cámara (similar al ResetState())
        controls.reset();
        camera.position.z = 5;
        controls.target.set(0, 0, 0); // Asegura que mire al centro
    }
}

// Bucle de render (Update)
function animate() {
    requestAnimationFrame(animate);
    controls.update(); // Actualiza los controles (para el damping)
    renderer.render(scene, camera);
}

// Maneja el redimensionamiento de la ventana
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// --- 3. INICIAR LA APLICACIÓN ---
init();