// src/popup/ipInfoManager.js

function getRiskColorInternal(score) {
  // Convert score to a value between 0 and 1
  const normalizedScore = score / 100;

  // Green to Blue gradient
  // Green: rgb(0, 128, 0)
  // Blue: rgb(0, 0, 255)
  const green = Math.round(128 * (1 - normalizedScore));
  const blue = Math.round(255 * normalizedScore);

  return `rgb(0, ${green}, ${blue})`;
}

function loadIpInfoAndRiskAssessmentInternal() {
  // Fetch IP information
  fetch('https://ip234.in/ip.json')
    .then(response => response.json())
    .then(data => {
      const ipInfoDiv = document.getElementById('ip-info');
      if (ipInfoDiv) { // Add null check for safety
        ipInfoDiv.innerHTML = `
          <p>IP: ${data.ip}</p>
          <p>City: ${data.city}</p>
          <p>Country: ${data.country}</p>
          <p>Organization: ${data.organization}</p>
          <p>Timezone: ${data.timezone}</p>
        `;
      } else {
        console.warn('ipInfoManager: ip-info element not found.');
      }
    })
    .catch(error => {
      const ipInfoDiv = document.getElementById('ip-info');
      if (ipInfoDiv) {
        ipInfoDiv.textContent = 'Failed to load IP information.';
      }
      console.error('ipInfoManager: Error fetching IP info:', error);
    });

  // Fetch risk assessment
  fetch('https://ip234.in/f.json')
    .then(response => response.json())
    .then(data => {
      const riskAssessmentDiv = document.getElementById('risk-assessment');
      if (riskAssessmentDiv && data && data.data) { // Add null checks
        const score = data.data.score;
        const risk = data.data.risk;
        const color = getRiskColorInternal(score); // Use internal function
        riskAssessmentDiv.innerHTML = `
          <p>Risk: <span style="color: ${color}">${risk}</span></p>
          <p>Score: <span style="color: ${color}">${score}/100</span></p>
        `;
      } else {
        console.warn('ipInfoManager: risk-assessment element or risk data not found.');
        if (riskAssessmentDiv) {
            riskAssessmentDiv.textContent = 'Failed to load risk assessment data.';
        }
      }
    })
    .catch(error => {
      const riskAssessmentDiv = document.getElementById('risk-assessment');
      if (riskAssessmentDiv) {
        riskAssessmentDiv.textContent = 'Failed to load risk assessment.';
      }
      console.error('ipInfoManager: Error fetching risk assessment:', error);
    });
}

// Expose functions to the global scope via window.ipInfoManagerUtils
window.ipInfoManagerUtils = {
  loadIpInfoAndRiskAssessment: loadIpInfoAndRiskAssessmentInternal,
  // getRiskColor is internal and not exposed directly, but used by loadIpInfoAndRiskAssessmentInternal
};

console.log('ipInfoManager.js loaded and ipInfoManagerUtils initialized');