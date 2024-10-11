// Get references to DOM elements
const textarea = document.getElementById('policy-input');
const errorMessage = document.getElementById('error-message');
const networkContainer = document.getElementById('network');
const downloadButton = document.getElementById('download-btn');

let network = null;

// Debounce function to limit update frequency
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Function to parse policy and update graph
function updateGraph() {
  const policyText = textarea.value;
  errorMessage.textContent = ''; // Clear previous error messages

  if (!policyText.trim()) {
    // Clear the graph if textarea is empty
    if (network) {
      network.setData({ nodes: [], edges: [] });
    }
    return;
  }

  try {
    const policyData = JSON.parse(policyText);
    if (!isValidPolicyData(policyData)) {
      throw new Error('Invalid Azure IAM policy structure.');
    }
    const { nodes, edges } = parsePolicy(policyData);
    drawGraph(nodes, edges);
  } catch (e) {
    errorMessage.textContent = `Error: ${e.message}`;
  }
}

// Function to validate the policy data structure
function isValidPolicyData(policyData) {
  if (!Array.isArray(policyData)) return false;
  return policyData.every((assignment) => {
    return assignment.hasOwnProperty('principalName') && assignment.hasOwnProperty('roleDefinitionName');
  });
}

// Function to parse the Azure IAM policy JSON
function parsePolicy(policyData) {
  const nodes = [];
  const edges = [];

  policyData.forEach((assignment) => {
    const principal = assignment.principalName || assignment.principalId || 'Unknown Principal';
    const role = assignment.roleDefinitionName || assignment.roleDefinitionId || 'Unknown Role';
    const scope = assignment.scope || 'Unknown Scope';

    // Add principal node
    nodes.push({ id: principal, label: principal, group: 'principal' });
    // Add role node
    nodes.push({ id: role, label: role, group: 'role' });
    // Add edge between principal and role
    edges.push({ from: principal, to: role, label: scope });
  });

  return { nodes: deduplicate(nodes), edges: deduplicate(edges) };
}

// Helper function to remove duplicate nodes or edges
function deduplicate(items) {
  const seen = {};
  return items.filter((item) => {
    const key = JSON.stringify(item);
    return seen.hasOwnProperty(key) ? false : (seen[key] = true);
  });
}

// Function to draw the graph
function drawGraph(nodesArray, edgesArray) {
  const data = {
    nodes: new vis.DataSet(nodesArray),
    edges: new vis.DataSet(edgesArray),
  };

  const options = {
    nodes: {
      shape: 'dot',
      size: 15,
      font: {
        size: 14,
      },
    },
    edges: {
      arrows: {
        to: { enabled: true, scaleFactor: 1 },
      },
      font: {
        align: 'middle',
      },
    },
    groups: {
      principal: {
        color: { background: 'lightgreen', border: 'green' },
      },
      role: {
        color: { background: 'lightblue', border: 'blue' },
      },
    },
    layout: {
      improvedLayout: true,
    },
    physics: {
      stabilization: true,
    },
  };

  if (network === null) {
    network = new vis.Network(networkContainer, data, options);
  } else {
    network.setData(data);
  }
}

// Update graph when textarea content changes, with debounce
textarea.addEventListener('input', debounce(updateGraph, 500));

// Download graph as image
downloadButton.addEventListener('click', () => {
  const canvas = network.canvas.frame.canvas;
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = 'azure-iam-graph.png';
  link.click();
});
