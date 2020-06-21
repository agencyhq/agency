const chatId = 127792927

const legionInvasion = new Date('2020-06-16T01:30:00Z')

const reminders = [{
  time: '09:00',
  text: 'Wake up, sunshine!'
}, {
  time: '10:00',
  text: 'Breakfast time'
}, {
  time: '13:00',
  text: 'Lunch time'
}, {
  time: '16:00',
  text: 'Tea time'
}, {
  time: '20:00',
  text: 'Dinner time'
}, {
  time: '22:00',
  text: "Let's start winding down"
}, {
  time: '00:00',
  text: 'Time to go to sleep'
}, {
  time: ({ iso }) => {
    const minutesSinceInvasion = (new Date(iso) - legionInvasion) / (60 * 1000)
    const invasionPeriod = 18 * 60 + 30

    return !(minutesSinceInvasion % invasionPeriod)
  },
  text: 'invasion has started'
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
