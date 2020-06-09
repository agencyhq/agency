module.exports = {
  if:
    trigger => trigger.type === 'telegram' &&
    trigger.event.text.indexOf('echo ') === 0,
  then: trigger => ({
    action: 'telegram',
    parameters: {
      chatId: trigger.event.chat.id,
      text: trigger.event.text.substring(5)
    }
  })
}
