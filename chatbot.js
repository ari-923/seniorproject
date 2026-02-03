// Grabs required DOM elements from the page for controls/output.
const chatLog = document.getElementById('chatLog');
const chatInput = document.getElementById('chatInput');
const chatSend = document.getElementById('chatSend');
// Implements the next part of the estimator workflow.
function addMsg(text, from = 'bot') {
const div = document.createElement('div');
div.textContent = (from === 'user' ? 'You: ' : 'AI: ') + text;
// Implements the next part of the estimator workflow.
chatLog.appendChild(div);
chatLog.scrollTop = chatLog.scrollHeight;
}
// Implements the next part of the estimator workflow.
chatSend.onclick = async () => {
const msg = chatInput.value.trim();
if (!msg) return;
// Implements the next part of the estimator workflow.
chatInput.value = '';
addMsg(msg, 'user');
try {
// Exposes a summary of totals/selections so the chat widget can use it.
const snapshot = window.getEstimatorSnapshot?.() || {};
const res = await fetch('/api/chat', {
method: 'POST',
// Implements the next part of the estimator workflow.
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ message: msg, snapshot })
});
// Implements the next part of the estimator workflow.
const data = await res.json();
addMsg(data.reply || 'No response.');
} catch {
addMsg('AI unavailable. Are you on Vercel?');
// Implements the next part of the estimator workflow.
}
};
