// Code Puppy API client

class CodePuppyClient {
  constructor(apiUrl = 'http://localhost:8080') {
    this.apiUrl = apiUrl;
  }

  // Send code to Code Puppy for editing
  async editCode(content, language = 'javascript') {
    try {
      const response = await fetch(`${this.apiUrl}/edit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content,
          language
        })
      });

      if (!response.ok) {
        throw new Error(`Code Puppy API error: ${response.statusText}`);
      }

      const result = await response.json();
      return result.editedContent || result.suggestions || content;
    } catch (error) {
      console.error('Error calling Code Puppy:', error);
      // Return original content with a note about the error
      return content + '\n\n// Code Puppy error: ' + error.message + ' 🐶😢';
    }
  }

  // Get code explanations from Code Puppy
  async explainCode(content, language = 'javascript') {
    try {
      const response = await fetch(`${this.apiUrl}/explain`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content,
          language
        })
      });

      if (!response.ok) {
        throw new Error(`Code Puppy API error: ${response.statusText}`);
      }

      const result = await response.json();
      return result.explanation || 'No explanation available';
    } catch (error) {
      console.error('Error getting explanation from Code Puppy:', error);
      return 'Error getting explanation: ' + error.message + ' 🐶❓';
    }
  }

  // Generate code with Code Puppy
  async generateCode(prompt, language = 'javascript') {
    try {
      const response = await fetch(`${this.apiUrl}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt,
          language
        })
      });

      if (!response.ok) {
        throw new Error(`Code Puppy API error: ${response.statusText}`);
      }

      const result = await response.json();
      return result.generatedCode || result.code || '// Code Puppy: No code generated';
    } catch (error) {
      console.error('Error generating code with Code Puppy:', error);
      return '// Code Puppy error: ' + error.message + ' 🐶💥';
    }
  }
}

module.exports = CodePuppyClient;