// Importamos los módulos necesarios de Three.js desde el CDN
import * as THREE from 'three';
// CAMBIO: Importamos TrackballControls en lugar de OrbitControls
import { TrackballControls } from 'three/addons/controls/TrackballControls.js';
// Importamos el cargador de modelos GLTF
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';


// --- 1. CONFIGURACIÓN DE LA ESCENA ---

let scene, camera, renderer, controls;
let currentModel = null;
const productPool = {}; // "Object Pool" para los modelos

// Referencia al indicador de carga
const loaderElement = document.getElementById('loader');

// Base de datos de productos
const productDatabase = [
    // { 
    //     id: 'bathroomSet', 
    //     name: 'Set de Baño', 
    //     type: 'GLB', 
    //     path: 'models/bathroom_props_free.glb'
    // },
    { id: 'esfera', name: 'Esfera', type: 'Sphere' },
    { id: 'cubo', name: 'Cubo', type: 'Box' },
    { id: 'cilindro', name: 'Cilindro', type: 'Cylinder' },
    { id: 'dona', name: 'Dona', type: 'Torus' },
    { id: 'cono', name: 'Cono', type: 'Cone' },
];

// --- 2. FUNCIONES PRINCIPALES ---

function init() {
    // Configuración de la Escena
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x333333); 

    // Configuración de la Cámara
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    // Configuración del Renderer
    const canvas = document.getElementById('canvas-3d');
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Configuración de las Luces
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);

    // --- CAMBIO IMPORTANTE ---
    // Usamos TrackballControls
    controls = new TrackballControls(camera, renderer.domElement);
    // Ajustes para que se sienta bien
    controls.rotateSpeed = 4.0;
    controls.zoomSpeed = 1.2;
    controls.panSpeed = 0.8;
    controls.noZoom = false;
    controls.noPan = false;
    controls.staticMoving = true;
    controls.dynamicDampingFactor = 0.3;
    // --- FIN DEL CAMBIO ---

    // Inicia la carga asíncrona de la app
    loadApp();

    // Bucle de animación
    animate();

    // Evento de redimensionamiento
    window.addEventListener('resize', onWindowResize);
}

// Función asíncrona para cargar recursos
async function loadApp() {
    try {
        await createProductPool();
        
        createProductButtons();
        
        displayProduct(productDatabase[0]);

        // Oculta el loader
        loaderElement.classList.add('hidden');

    } catch (error) {
        console.error("Error fatal al cargar la app:", error);
        loaderElement.innerText = "Error al cargar los modelos. Refresca la página.";
    }
}

// Carga y pre-instancia todos los modelos
async function createProductPool() {
    const material = new THREE.MeshStandardMaterial({ color: 0x007bff });
    const loader = new GLTFLoader();

    const loadPromises = productDatabase.map(product => {
        let modelPromise;

        if (product.type === 'GLB') {
            modelPromise = loader.loadAsync(product.path).then(gltf => {
                const model = gltf.scene;
                
                // Centrar y escalar el modelo
                const box = new THREE.Box3().setFromObject(model);
                const center = box.getCenter(new THREE.Vector3());
                model.position.sub(center); 

                const size = box.getSize(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.y, size.z);
                const scale = 3.0 / maxDim; 
                model.scale.set(scale, scale, scale);
                
                return model;

            }).catch(error => {
                console.error('Error al cargar el modelo:', product.path, error);
                const fallbackGeo = new THREE.BoxGeometry(2, 2, 2);
                const fallbackMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
                return new THREE.Mesh(fallbackGeo, fallbackMat);
            });

        } else {
            let geometry;
            switch (product.type) {
                case 'Box': geometry = new THREE.BoxGeometry(2, 2, 2); break;
                case 'Sphere': geometry = new THREE.SphereGeometry(1.5, 32, 32); break;
                case 'Cylinder': geometry = new THREE.CylinderGeometry(1, 1, 2, 32); break;
                case 'Torus': geometry = new THREE.TorusGeometry(1, 0.4, 16, 100); break;
                case 'Cone': geometry = new THREE.ConeGeometry(1, 2, 32); break;
                default: geometry = new THREE.BoxGeometry(2, 2, 2);
            }
            modelPromise = Promise.resolve(new THREE.Mesh(geometry, material));
        }

        return modelPromise.then(model => ({
            id: product.id,
            model: model
        }));
    });

    const loadedModels = await Promise.all(loadPromises);

    loadedModels.forEach(item => {
        item.model.visible = false; 
        scene.add(item.model);
        productPool[item.id] = item.model; 
    });
}

// Crea los botones en la UI (HTML)
function createProductButtons() {
    const container = document.getElementById('buttonContainer');
    productDatabase.forEach(product => {
        const button = document.createElement('button');
        button.className = 'product-button';
        button.innerText = product.name;
        
        button.addEventListener('click', () => {
            displayProduct(product);
        });
        
        container.appendChild(button);
    });
}

// Muestra un producto (activándolo del pool)
function displayProduct(productData) {
    if (currentModel) {
        currentModel.visible = false;
    }

    const modelToShow = productPool[productData.id];
    if (modelToShow) {
        modelToShow.visible = true;
        currentModel = modelToShow;
        
        // --- CAMBIO IMPORTANTE ---
        // Reseteamos los controles y la cámara
        controls.reset();
        camera.position.set(0, 0, 5); // Posición inicial de la cámara
        // Apuntamos al centro del modelo (que está en 0,0,0)
        controls.target.set(0, 0, 0); 
        // --- FIN DEL CAMBIO ---
    }
}

// Bucle de render (Update)
function animate() {
    requestAnimationFrame(animate);
    controls.update(); // Esencial para TrackballControls
    renderer.render(scene, camera);
}

// Maneja el redimensionamiento de la ventana
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    // --- CAMBIO IMPORTANTE ---
    // TrackballControls también necesita saber el nuevo tamaño
    controls.handleResize();
    // --- FIN DEL CAMBIO ---
}

// --- 3. INICIO DE LA APLICACIÓN ---
init();