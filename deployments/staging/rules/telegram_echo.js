export function condition ({ type, event }) {
  return type === 'telegram' &&
    event.text === '/chatid'
}

export function then ({ event }) {
  return {
    action: 'telegram',
    parameters: {
      chatId: event.chat.id,
      text: event.chat.id
    }
  }
}
