import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { createMaterial } from '../texture_loader.js';

export class Obstacles {
    constructor(scene) {
        this.scene = scene;
        this.obstacles = [];
        this.objLoader = new OBJLoader();
        this.mtlLoader = new MTLLoader();
        this.fbxLoader = new FBXLoader();
        this.crabModel = null;
        this.dolphinModel = null;
    }

    async init() {
        // Pre-load the crab model
        await this.loadCrabModel();
        await this.loadDolphinModel();
    }

    createObstacles() {
        //this.createLogs();  
        this.createCrabs();
        this.createDolphins();
    }

    updateObstacles(time) {
        this.obstacles.forEach(obstacle => {
            if (obstacle.type === 'crab') {
                this.updateCrab(obstacle, time);
            } else if (obstacle.type === 'dolphin') {
                this.updateDolphin(obstacle, time);
            }
        });
    }

    // Get obstacles for collision detection
    getObstacles() {
        return this.obstacles;
    }


    /*-----------------------------------------------CRABS------------------------------------------------- */

    async loadCrabModel() {
        return new Promise((resolve, reject) => {
            // First load the MTL file
            this.mtlLoader.load(
                '../objects/crab/crab.mtl', // Path to the MTL file
                (materials) => {
                    materials.preload();
                    
                    // Apply materials to the OBJ loader
                    this.objLoader.setMaterials(materials);
                    
                    // Now load the OBJ file with materials
                    this.objLoader.load(
                        '../objects/crab/crab.obj',
                        (object) => {
                            // Configure the loaded model
                            object.traverse((child) => {
                                if (child.isMesh) {
                                    // Enable shadows
                                    child.castShadow = true;
                                    child.receiveShadow = true;
                                    
                                    // If material exists from MTL, keep it; otherwise use fallback
                                    if (!child.material) {
                                        child.material = new THREE.MeshLambertMaterial({ 
                                            color: 0xFF4500 // Orange-red crab color as fallback
                                        });
                                    }
                                }
                            });
                            
                            // Scale the model appropriately
                            object.scale.set(0.1, 0.1, 0.1);
                            
                            this.crabModel = object;
                            //this.debugCrabModel(object); // to understand the parts, comment for less spam
                            //console.log('Crab model loaded successfully with materials');
                            resolve(object);
                        },
                        (progress) => {
                            console.log('Loading crab OBJ:', (progress.loaded / progress.total * 100) + '%');
                        },
                        (error) => {
                            console.warn('Could not load crab OBJ file:', error);
                            reject(error);
                        }
                    );
                },
                (progress) => {
                    console.log('Loading crab MTL:', (progress.loaded / progress.total * 100) + '%');
                },
                (error) => {
                    console.warn('Could not load crab MTL file', error);
                    
                }
            );
        });
    }

    
    // DEBUG: Method to scan and log all parts of the crab model
   /* debugCrabModel(crabObject) {
        console.log('=== CRAB MODEL STRUCTURE ===');
       // console.log('Root object:', crabObject);
        //console.log('Children count:', crabObject.children.length);
        
        let meshCount = 0;
        
        crabObject.traverse((child, index) => {
            if (child.isMesh) {
                meshCount++;
                console.log(`--- Mesh ${meshCount} ---`);
                console.log('Name:', child.name || 'NO NAME');
                console.log('Type:', child.type);
                console.log('Position:', {
                    x: child.position.x.toFixed(3),
                    y: child.position.y.toFixed(3),
                    z: child.position.z.toFixed(3)
                });
                console.log('Scale:', {
                    x: child.scale.x.toFixed(3),
                    y: child.scale.y.toFixed(3),
                    z: child.scale.z.toFixed(3)
                });
                console.log('Geometry:', child.geometry.type);
                console.log('Material:', child.material ? child.material.type : 'NO MATERIAL');
                console.log('UUID:', child.uuid);
                console.log('---');
            } else if (child.isGroup || child.isObject3D) {
                console.log(`Group/Object3D: "${child.name || 'NO NAME'}" - Type: ${child.type}`);
            }
        });
        
        console.log(`Total meshes found: ${meshCount}`);
        console.log('=== END CRAB MODEL STRUCTURE ===');
    }*/
    
    createCrabs() {
        const crabPositions = [
            { x: -12, z: 5, direction: 1 },
            { x: 10, z: 1, direction: -1 },
            { x: -25, z: 2, direction: 1 },
            { x: 32, z: 1, direction: -1 }
        ];
        
        crabPositions.forEach((pos, index) => {
            if (this.crabModel) {
                // Clone the loaded crab model
                const crab = this.crabModel.clone();
                crab.position.set(pos.x, 0.5, pos.z);
                crab.castShadow = true;
                
                // Random initial rotation
                crab.rotation.y = Math.random() * Math.PI * 2;
                
                this.scene.add(crab);
                
                this.obstacles.push({
                    mesh: crab,
                    type: 'crab',
                    direction: pos.direction,
                    speed: 0.008 + Math.random() * 0.004, // Varied speed
                    originalZ: pos.z,
                    platformX: pos.x,
                    animationData: {
                        walkCycle: Math.random() * Math.PI * 2, // Random start phase
                        bobAmount: 0.1 + Math.random() * 0.05,  // Slight vertical bobbing
                        rotationSpeed: 0.02 + Math.random() * 0.01,
                        scuttleRange: 3 + Math.random() * 2 // How far they move
                    }
                });
            }
        });
    }


    updateCrab(crab, time) {
        const anim = crab.animationData;
        
        // Scuttling movement (side to side)
        crab.mesh.position.z += crab.direction * crab.speed;
        if (Math.abs(crab.mesh.position.z - crab.originalZ) > anim.scuttleRange) {
            crab.direction *= -1;
            // Face the new direction
            crab.mesh.rotation.y += Math.PI;
        }
        
        // Walking animation - vertical bobbing
        anim.walkCycle += 0.15;
        const bobOffset = Math.sin(anim.walkCycle) * anim.bobAmount;
        crab.mesh.position.y = 1 + bobOffset;
        
        // crab animation
        this.animateWholeCrab(crab.mesh, anim);
                
        // Random direction changes occasionally
        if (Math.random() < 0.001) {
            crab.direction *= -1;
            crab.mesh.rotation.y += Math.PI;
        }
    }
    animateWholeCrab(crabMesh, animData) {
        const time = animData.walkCycle;
        
        // Side-to-side scuttling motion 
        const scuttleMotion = Math.sin(time * 2) * 0.1;
        crabMesh.rotation.z = scuttleMotion;
        
        // Forward/backward motion
        const rockMotion = Math.sin(time * 1.5) * 0.08;
        crabMesh.rotation.x = rockMotion;
        
        // Slight lifting motion to simulate claw raising
        const liftMotion = Math.sin(time * 3) * 0.05;
        crabMesh.position.y += liftMotion;
        
        // Subtle turning motion for more life-like movement
        const turnMotion = Math.sin(time * 0.8) * 0.1;
        crabMesh.rotation.y += turnMotion * 0.01;
        
        // Scale animation to simulate breathing/pulsing
        const breatheScale = 1 + Math.sin(time * 4) * 0.02;
        crabMesh.scale.set(0.1 * breatheScale, 0.1 * breatheScale, 0.1 * breatheScale);
    }



    /*----------------------------------------------DOLPHINS--------------------------------------------------- */

    async loadDolphinModel() {
        return new Promise((resolve, reject) => {
            this.fbxLoader.load(
                '../objects/Dolphin.fbx',
                (object) => {
                    // const dolphinMaterial = await this.createDolphinMaterial();
                    object.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;

                            //child.material = dolphinMaterial;
                        }
                    });
                    object.scale.set(0.03, 0.03, 0.03);
                    this.dolphinModel = object;
                    //this.debugDolphinModel(object);
                    resolve(object);
                },
                (progress) => {
                    console.log('Loading dolphin model:', progress);
                },
                (error) => {
                    console.error('Error loading dolphin model:', error);
                    reject(error);
                }
            );
        });
    }


    // DEBUG: Method to analyze the dolphin model structure
    debugDolphinModel(dolphinObject) {
        console.log('=== DOLPHIN MODEL STRUCTURE ===');
        console.log('Root object:', dolphinObject.type);
        console.log('Children count:', dolphinObject.children.length);
        
        let meshCount = 0;
        let boneCount = 0;
        
        dolphinObject.traverse((child) => {
            if (child.isMesh) {
                meshCount++;
                console.log(`--- Mesh ${meshCount} ---`);
                console.log('Name:', child.name || 'NO NAME');
                console.log('Type:', child.type);
                console.log('Has skeleton:', !!child.skeleton);
                if (child.skeleton) {
                    console.log('Bone count:', child.skeleton.bones.length);
                    boneCount += child.skeleton.bones.length;
                }
                console.log('Geometry:', child.geometry.type);
                console.log('Material:', child.material ? child.material.type : 'NO MATERIAL');
            } else if (child.isBone) {
                console.log(`Bone: "${child.name || 'NO NAME'}"`);
            } else if (child.isGroup || child.isObject3D) {
                console.log(`Group/Object3D: "${child.name || 'NO NAME'}" - Type: ${child.type}`);
            }
        });
        
        console.log(`Total meshes: ${meshCount}, Total bones: ${boneCount}`);
        
        // Check for animations
        if (dolphinObject.animations) {
            console.log('Animations found:', dolphinObject.animations.length);
            dolphinObject.animations.forEach((anim, index) => {
                console.log(`  ${index}: "${anim.name}" - ${anim.duration}s - ${anim.tracks.length} tracks`);
            });
        }
        
        console.log('=== END DOLPHIN MODEL STRUCTURE ===');
    }

    createDolphins() {
        const dolphinPositions = [
            { x: 80, z: 15 },
            { x: 120, z: -25 },
            { x: 60, z: -15 },
            { x: 100, z: 25 }
        ];
        
        dolphinPositions.forEach((pos, index) => {
            if (this.dolphinModel) {
                // Clone the loaded dolphin model
                const dolphin = this.dolphinModel.clone();
                
                // Position at water level initially
                dolphin.position.set(pos.x, -1, pos.z); // Start at water level
                dolphin.castShadow = true;
                
                // Face a random direction initially
                dolphin.rotation.y = Math.random() * Math.PI * 2;
                
                this.scene.add(dolphin);
                
                this.obstacles.push({
                    mesh: dolphin,
                    type: 'dolphin',
                    animationData: {
                        centerX: pos.x,
                        centerZ: pos.z,
                        jumpPhase: Math.random() * Math.PI * 2, // Random jump timing
                        jumpHeight: 3 + Math.random() * 2, // How high they jump
                        jumpFrequency: 0.5 + Math.random() * 0.3, // How often they jump
                        underwater: false,
                        swimDepth: -2 - Math.random() * 1, // How deep they swim
                        rotationOffset: Math.random() * Math.PI * 2,
                        baseRotation: dolphin.rotation.y, // Keep the initial rotation
                        // Swimming movement
                        swimAngle: Math.random() * Math.PI * 2, // Random starting swim angle
                        swimRadius: 2 + Math.random() * 3, // How far they swim from center (2-5 units)
                        swimSpeed: 0.01 + Math.random() * 0.005, // Swimming speed variation
                        swimPhase: Math.random() * Math.PI * 2 // Swimming phase offset
                    }
                });
            }
        });
    }

    updateDolphin(dolphin, time) {
        const anim = dolphin.animationData;
        
        // Update swimming movement
        anim.swimAngle += anim.swimSpeed;       //this increases every update
        
        // Calculate swimming position (small circular or figure-8 movement)
        const swimOffsetX = Math.cos(anim.swimAngle) * anim.swimRadius; //smooth circular motion
        const swimOffsetZ = Math.sin(anim.swimAngle * 0.7) * anim.swimRadius * 0.6; // * 0.7 breaks symmetry, creates a like-8 motion, no perfect circle, nice gonna keep it
        
        const currentX = anim.centerX + swimOffsetX;    //recreate something circular
        const currentZ = anim.centerZ + swimOffsetZ;    //recreate something circular
        
        // Update jump phase
        anim.jumpPhase += anim.jumpFrequency * 0.02;    //increases every update
        
        // Determine if dolphin should be jumping or swimming, random
        const jumpCycle = Math.sin(anim.jumpPhase);
        const isJumping = jumpCycle > 0.7; // Jump when sine wave is high, else go underwater
        
        if (isJumping && !anim.underwater) {
            // Jumping above water
            const jumpProgress = (jumpCycle - 0.7) / 0.3; // Normalize to 0-1 the sin wave
            const jumpY = this.easeInOutQuad(jumpProgress) * anim.jumpHeight;   //3-5 units jumpHeight
            
            // Jump from current swimming position
            dolphin.mesh.position.set(currentX, -1 + jumpY, currentZ);
            
            // Face swimming direction during jump
            const movementDirection = Math.atan2(swimOffsetZ, swimOffsetX);
            dolphin.mesh.rotation.y = movementDirection;
            
            // Add jumping arc rotation
            const jumpRotation = jumpProgress * Math.PI * 0.2;
            dolphin.mesh.rotation.x = jumpRotation;
            
        } else {
            // Swimming underwater or at surface
            anim.underwater = jumpCycle < 0.3;
            const swimY = anim.underwater ? anim.swimDepth : -1; //when above is true, dolphin goes down. else -> water level (-1)
            
            // Add some gentle bobbing motion to simulate swimming
            const swimBob = Math.sin(time * 2 + anim.rotationOffset) * 0.1;
            dolphin.mesh.position.set(currentX, swimY + swimBob, currentZ);
            
            // Face swimming direction, here use atan2 to compute angle from the X axe and the point in plane. Use atan2 rather than atan cuz has no ambiguity situations 
            const movementDirection = Math.atan2(swimOffsetZ, swimOffsetX); //my Y is the Z cuz the plane is flat
            dolphin.mesh.rotation.y = movementDirection;    //this to face the direction the dolphin is swimming 
            dolphin.mesh.rotation.x = Math.sin(time * 1.5 + anim.rotationOffset) * 0.05; // swimming motion (bobbing)
        }
        
        // Add some tail movement animation
        this.animateDolphinTail(dolphin.mesh, time, anim);
    }

    animateDolphinTail(dolphinMesh, time, animData) {
        // More active tail swishing during swimming
        const swimIntensity = 1 + Math.sin(animData.swimAngle * 2) * 0.3; // Vary intensity based on movement
        const tailSwim = Math.sin(time * 5 + animData.rotationOffset) * 0.04 * swimIntensity;   // side to side (z) tail motion
        dolphinMesh.rotation.z = tailSwim;

        // Change scale over time, pretty useless but now i am fond of the breathing effect
        const breatheScale = 1 + Math.sin(time * 6 + animData.rotationOffset) * 0.02;
        dolphinMesh.scale.set(0.03 * breatheScale, 0.03 * breatheScale, 0.03 * breatheScale);
    }

        // Easing function for smooth jump animation
    easeInOutQuad(t) {  //slow start, fast middle, slow end
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }
  
}
