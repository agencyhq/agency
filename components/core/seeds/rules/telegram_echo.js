export function condition (trigger) {
  return trigger.type === 'telegram' &&
    trigger.event.text.indexOf('echo ') === 0
}

export function then (trigger) {
  return {
    action: 'telegram',
    parameters: {
      chatId: trigger.event.chat.id,
      text: trigger.event.text.substring(5)
    }
  }
}
