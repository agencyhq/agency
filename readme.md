Agency
------

General-purpose automation for those, who are not ecstatic of learning yet another DSL.

### Basics

Agency operates on a same trinity of trigger, rule and execution concepts you've come to expect from projects promising you general-purpose automation.

`Triggers` are subset of events outside the system that we care about and want to use in our decision-making process. A message send to the chat bot or a webhook call made to an endpoint each result in a trigger.

`Rule` defines the response to a particular trigger and whether response is even required in the first place. The basic rule consists of condition and transformation (or in other words `if` and `then` portion). If triggers fulfills the condition of the rule, then the execution gets created based on that trigger's data.

`Execution` describes the action that needs to happen. It usually consists of the type of action and a set of parameters describing it. It also holds the information that help you later track down the state and result of the response.

There's a number of smaller concepts that play a role, but the crucial part is to understand the flow:

 - an event happens in the world outside the system
 - `sensor` translates some of this events into `triggers`
 - every `trigger` gets evaluated over every `rule`'s condition
 - `triggers` that fulfill `rule`'s condition are further evaluated over respective transformations and for every one of them an `execution` gets created
 - an `actionrunner` picks up `executions` it can fulfill, acts upon them and reports back the result

The main task of the Agency is to ensure the correct and continuous flow of of the data between the components, to provide protocol of communication, persistence, resiliency, access control and more to enable developers to focus on things they need to automate.

### Usage

Agency is provided as a service on https://core.agencyhq.org.

The service comes with a number of components available out-the-box. You can use our `cron` sensor to schedule recurring events, a `github` adapter to watch for events on your repository and make calls to Github API, or a `telegram` bot to send notifications to yourself.

Agency service also provides a rule engine that lets you write rules in Javascript right inside your browser or upload them via CLI.

You can either build your automation entirely based on sensors and action runners the service provides or you can write and run your own components by requesting a token and implementing communication protocol described at https://protocol.agencyhq.org/.

You can run your components in the cloud, on your own infrastructure behind corporate firewall, locally on your development machine and, if you're feeling really bold, even right inside your browser. Anywhere you can initiate an outgoing websocket connection from.

You can implement a sensor that listens for events inside your internal network, an action runner that has an access to your secrets storage without exposing it to an outside world, you can have your own rule engine that allows you to write rules in the language of your choosing or even use machine learning instead.

Our goal is to reduce the amount of routine, help you build trust in your automation and, if not eliminate some types of work entirely, at least help you deal with them, proactively or retroactively, during your business hours.

### Development

To run development version:

    $ npm i
    $ docker-compose up db mq
    $ npm run migrate --esm
    $ npm start

Then you can open http://localhost:1234/ to see some basic UI or hit `npm run integration` to make sure it all works as expected.

We have a number of deployments you can try out to see how different components come together to build a system you need. Take a look at README's in `deployments` directory.
