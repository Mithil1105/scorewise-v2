// Script to check available Gemini models
// Run with: GEMINI_API_KEY=your_key node check-gemini-models.js
// Or set the API key in the environment variable

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('Error: GEMINI_API_KEY environment variable is required');
  console.log('Usage: GEMINI_API_KEY=your_key node check-gemini-models.js');
  process.exit(1);
}

async function listModels() {
  try {
    const availableModels = [];
    
    // Try v1beta first
    console.log('Checking v1beta models...\n');
    const responseV1Beta = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`
    );
    
    if (responseV1Beta.ok) {
      const dataV1Beta = await responseV1Beta.json();
      console.log('=== v1beta Models (with generateContent support) ===');
      if (dataV1Beta.models) {
        dataV1Beta.models.forEach(model => {
          const supportedMethods = model.supportedGenerationMethods || [];
          if (supportedMethods.includes('generateContent')) {
            const modelName = model.name.replace('models/', '');
            console.log(`✓ ${modelName}`);
            console.log(`  Full name: ${model.name}`);
            console.log(`  Display name: ${model.displayName || 'N/A'}`);
            console.log(`  Description: ${model.description || 'N/A'}`);
            console.log('');
            availableModels.push({ version: 'v1beta', name: modelName, fullName: model.name });
          }
        });
      }
      if (availableModels.length === 0) {
        console.log('No models found with generateContent support in v1beta\n');
      }
    } else {
      const error = await responseV1Beta.text();
      console.log('v1beta error:', error);
    }

    // Try v1
    console.log('\nChecking v1 models...\n');
    const responseV1 = await fetch(
      `https://generativelanguage.googleapis.com/v1/models?key=${GEMINI_API_KEY}`
    );
    
    if (responseV1.ok) {
      const dataV1 = await responseV1.json();
      console.log('=== v1 Models (with generateContent support) ===');
      if (dataV1.models) {
        dataV1.models.forEach(model => {
          const supportedMethods = model.supportedGenerationMethods || [];
          if (supportedMethods.includes('generateContent')) {
            const modelName = model.name.replace('models/', '');
            console.log(`✓ ${modelName}`);
            console.log(`  Full name: ${model.name}`);
            console.log(`  Display name: ${model.displayName || 'N/A'}`);
            console.log(`  Description: ${model.description || 'N/A'}`);
            console.log('');
            availableModels.push({ version: 'v1', name: modelName, fullName: model.name });
          }
        });
      }
      if (availableModels.length === 0) {
        console.log('No models found with generateContent support in v1\n');
      }
    } else {
      const error = await responseV1.text();
      console.log('v1 error:', error);
    }

    // Summary
    console.log('\n=== SUMMARY ===');
    console.log(`Found ${availableModels.length} model(s) with generateContent support:`);
    availableModels.forEach(m => {
      console.log(`  - ${m.name} (${m.version})`);
    });
    
    if (availableModels.length > 0) {
      console.log('\n=== RECOMMENDED USAGE ===');
      const recommended = availableModels.find(m => m.name.includes('flash')) || availableModels[0];
      console.log(`Use: ${recommended.version}/models/${recommended.name}:generateContent`);
    }

  } catch (error) {
    console.error('Error listing models:', error);
  }
}

listModels();

