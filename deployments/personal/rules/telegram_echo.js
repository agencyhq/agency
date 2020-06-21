const chatId = 127792927

const reminders = [{
  time: ({ hours, minutes }) => hours === 16 && minutes === 0,
  text: "4 o'clock"
}]

export function condition (trigger) {
  return trigger.type === 'cron' &&
    reminders.some(r => r.time(trigger.event))
}

export function then (trigger) {
  const { text } = reminders.find(r => r.time(trigger.event))

  return {
    action: 'telegram',
    parameters: {
      chatId,
      text
    }
  }
}
