const newman = require('newman');
const path = require('path');

const collections = [
    path.join(__dirname, 'collections/auth', '[Auth Flow -  UHP] Token Expiration.postman_collection.json'),
    path.join(__dirname, 'collections/access', '[Access Flow - HP] Configure Successful access for a vehicle.postman_collection.json'),
    path.join(__dirname, 'collections/access', '[Access Flow - UHP]  Vehicle access verification - Blocked Credential.postman_collection.json'),
    path.join(__dirname, 'collections/access', '[Access Flow - UHP] Vehicle access verification - Blocked Accessor.postman_collection.json'),
    path.join(__dirname, 'collections/access', '[Access Flow - UHP] Vehicle access verification - Outside Schedule.postman_collection.json'),
    path.join(__dirname, 'collections/access', '[Access Flow - UHP] Vehicle access verification - Unregistered.postman_collection.json'),
    path.join(__dirname, 'collections/access', '[Access Flow - UHP] Cross Collection Access.postman_collection.json'),
    path.join(__dirname, 'collections/access', '[Access Flow - UHP] Invalid Collection Headers CLP-Collection-Id missed.postman_collection.json')
];

async function runCollection(collection) {
    return new Promise((resolve, reject) => {
        console.log(`\nRunning: ${path.basename(collection)}`);
        
        newman.run({
            collection: collection,
            environment: path.join(__dirname, 'environments', 'Assessment_Cloudworks.postman_environment.json'),
            reporters: ['cli']
        }, (err, summary) => {
            if (err) {
                console.error(`Error with collection ${path.basename(collection)}:`, err.message);
                return reject(err);
            }
            
            const {failures} = summary.run;
            if (failures.length) {
                console.log(`Failed: ${path.basename(collection)}`);
                return reject(failures);
            }
            
            console.log(`Passed: ${path.basename(collection)}`);
            resolve();
        });
    });
}

(async () => {
    try {
        for (const collection of collections) {
            await runCollection(collection);
        }
        console.log('\nAll tests completed successfully!');
    } catch (error) {
        console.error('\nTests failed:', error);
        process.exit(1);
    }
})(); 