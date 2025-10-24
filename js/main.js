// Importamos los módulos necesarios
import * as THREE from 'three';
import { TrackballControls } from 'three/addons/controls/TrackballControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// --- 1. CONFIGURACIÓN DE LA ESCENA ---

let scene, camera, renderer, controls;
let currentModel = null;
let currentActiveButton = null; 
const productPool = {}; 

// Referencias a elementos de la UI
const loaderElement = document.getElementById('loader');
const titleElement = document.getElementById('productTitle'); 
const buttonContainer = document.getElementById('buttonContainer');
const productLineElement = document.getElementById('productLine');
const productNameElement = document.getElementById('productName');


// --- Base de datos de productos ---
const productDatabase = [
    { 
        id: 'olla', 
        name: 'Olla', 
        linea: 'Línea Lisboa', 
        type: 'GLB',
        path: 'models/olla.glb', 
        thumbnail: 'models/thumbnails/olla_thumb.png',
        initialPosition: { x: 0, y: -0.3, z: 0 },
         initialRotation: { x: 0, y: 90, z: 0 }
    },
    { 
          id: 'knife', 
        name: 'Knife', 
        linea: 'Línea Lisboa', 
        type: 'GLB',
        path: 'models/knife.glb', 
        thumbnail: 'models/thumbnails/knife_thumb.png', 
        initialRotation: { x: 0, y: 90, z: 45 }
        },{ 
        id: 'dona', 
        name: 'Dona',
        linea: 'Línea Primitiva',
        type: 'Torus',
        thumbnail: 'models/thumbnails/dona_thumb.jpg'
    },{ 
        id: 'cilindro', 
        name: 'Cilindro',
        linea: 'Línea Primitiva',
        type: 'Cylinder',
        thumbnail: 'models/thumbnails/cilindro_thumb.jpg'
    },{ 
        id: 'cono', // El "triángulo"
        name: 'Cono',
        linea: 'Línea Primitiva',
        type: 'Cone',
        thumbnail: 'models/thumbnails/cono_thumb.jpg'
    },{ 
        id: 'cubo', 
        name: 'Cubo',
        linea: 'Línea Primitiva',
        type: 'Box', 
        thumbnail: 'models/thumbnails/cube_thumb.jpg'
    },
];

// --- 2. FUNCIONES PRINCIPALES ---

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x6d6d6d); 

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    const canvas = document.getElementById('canvas-3d');
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); 
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0); 
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);

    controls = new TrackballControls(camera, renderer.domElement);
    controls.rotateSpeed = 4.0;
    controls.zoomSpeed = 1.2;
    controls.panSpeed = 0.8;
    controls.noZoom = false;
    controls.noPan = false;
    controls.staticMoving = true;
    controls.dynamicDampingFactor = 0.3;

    loadApp();
    animate();
    window.addEventListener('resize', onWindowResize);
}

// Carga asíncrona de recursos
async function loadApp() {
    try {
        await createProductPool();
        createProductButtons();
        displayProduct(productDatabase[0]); 
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

        if (product.type === 'GLB' || product.type === 'GLTF') {
            modelPromise = loader.loadAsync(product.path).then(gltf => {
                const model = gltf.scene;
                
                model.traverse(child => {
                    if (child.isMesh && child.material) {
                        child.material.transparent = false;
                        child.material.depthWrite = true;
                    }
                });

                // 1. Centrado automático (como antes)
                const box = new THREE.Box3().setFromObject(model);
                const center = box.getCenter(new THREE.Vector3());
                model.position.sub(center); 

                // 2. Escalado automático (como antes)
                const size = box.getSize(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.y, size.z);
                const scale = 3.0 / maxDim; 
                model.scale.set(scale, scale, scale);

                // --- (NUEVO) 3. Aplicar rotación inicial (si existe) ---
                if (product.initialRotation) {
                    model.rotation.set(
                        THREE.MathUtils.degToRad(product.initialRotation.x),
                        THREE.MathUtils.degToRad(product.initialRotation.y),
                        THREE.MathUtils.degToRad(product.initialRotation.z)
                    );
                }

                // --- (NUEVO) 4. Aplicar posición inicial (si existe) ---
                // Esto se *suma* a la posición centrada, actuando como un 'offset'
                if (product.initialPosition) {
                    model.position.add(
                        new THREE.Vector3(
                            product.initialPosition.x,
                            product.initialPosition.y,
                            product.initialPosition.z
                        )
                    );
                }
                
                return model;

            }).catch(error => {
                console.error('Error al cargar el modelo:', product.path, error);
                const fallbackGeo = new THREE.BoxGeometry(2, 2, 2);
                const fallbackMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
                return new THREE.Mesh(fallbackGeo, fallbackMat);
            });

        } else if (product.type) { 
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
        } else {
            modelPromise = Promise.resolve(new THREE.Object3D());
        }

        return modelPromise.then(model => ({
            id: product.id,
            model: model,
            button: null 
        }));
    });

    const loadedModels = await Promise.all(loadPromises);

    loadedModels.forEach(item => {
        item.model.visible = false; 
        scene.add(item.model);
        productPool[item.id] = item; 
    });
}

// Crea los botones en la UI
function createProductButtons() {
    productDatabase.forEach(product => {
        const button = document.createElement('button');
        button.className = 'product-button';
        
        if (product.thumbnail) {
            button.style.backgroundImage = `url(${product.thumbnail})`;
        } else {
            button.innerText = product.name[0]; 
            button.style.backgroundColor = '#ccc';
            button.style.color = 'black';
            button.style.fontSize = '24px'; 
            button.style.fontWeight = '700';
            button.style.textAlign = 'center';
            button.style.lineHeight = '90px'; 
        }
        
        button.addEventListener('click', () => {
            displayProduct(product);
        });
        
        if (productPool[product.id]) {
            productPool[product.id].button = button;
        }
        
        buttonContainer.appendChild(button);
    });
}

// Muestra un producto
function displayProduct(productData) {
    if (currentModel) {
        currentModel.visible = false;
    }
    
    if (currentActiveButton) {
        currentActiveButton.classList.remove('active');
    }

    const poolItem = productPool[productData.id];
    if (poolItem && poolItem.model) {
        poolItem.model.visible = true;
        currentModel = poolItem.model;
        
        if(poolItem.button) {
            poolItem.button.classList.add('active');
            currentActiveButton = poolItem.button;
        }
        
        if (titleElement && productLineElement && productNameElement) {
            productLineElement.innerText = productData.linea;
            productNameElement.innerText = ` / ${productData.name}`;
            titleElement.style.opacity = '1'; 
        }
        
        controls.reset();
        camera.position.set(0, 0, 5); 
        controls.target.set(0, 0, 0); 
    }
}

// Bucle de render (Update)
function animate() {
    requestAnimationFrame(animate);
    controls.update(); 
    renderer.render(scene, camera);
}

// Maneja el redimensionamiento de la ventana
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    controls.handleResize();
}

// --- 3. INICIO DE LA APLICACIÓN ---
init();