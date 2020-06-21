const chatId = 127792927

const reminders = [{
  time: ({ hours, minutes }) => hours === 14 && minutes === 0,
  text: "2 o'clock"
}, {
  time: '14:30',
  text: 'passed'
}, {
  time: '14:30',
  text: 'passed again'
}]

function match (event, reminder) {
  if (typeof reminder.time === 'function') {
    return !!reminder.time(event)
  }

  if (typeof reminder.time === 'string') {
    const [hours, minutes] = reminder.time.split(':')
    return event.hours === +hours && event.minutes === +minutes
  }
}

export function condition ({ type, event }) {
  return type === 'cron' &&
    reminders.some(r => match(event, r))
}

export function then ({ event }) {
  return reminders
    .filter(r => match(event, r))
    .map(({ text }) => ({
      action: 'telegram',
      parameters: {
        chatId,
        text
      }
    }))
}
