/* wave.radio · js/feedback.js · Send feedback to the team. Messages are read and answered in admin.html. */
$('pFb').onclick = () => { $('dProf').close(); $('fbT').value = ''; $('fbM').textContent = ''; $('dFb').showModal(); };
$('fbGo').onclick = async () => {
  const t = $('fbT').value.trim();
  if (t.length < 5) return void ($('fbM').textContent = 'Write at least a few words.');
  if (!sb || !user || user.id === 'demo') return void ($('fbM').textContent = 'Sign in to send feedback.');
  $('fbM').textContent = 'Sending...';
  const r = await sb.from('feedback').insert({message:t});
  if (r.error) return void ($('fbM').textContent = r.error.message + ' (run the feedback SQL file if you have not)');
  $('dFb').close(); toast('Thanks, your message was sent to the team.');
};
