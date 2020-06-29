import Head from 'next/head'
import PropTypes from 'prop-types'

import Header from '../components/header'
import Footer from '../components/footer'

function Hero ({ title, leading }) {
  return <section className="hero">
    <div className="container">
      <div className="left">
        <h1 className="title">{
          []
            .concat(title)
            .map((e, i) => [e, <br key={i} />])
        }</h1>
        <p className="leading">{ leading }</p>
        <div className="buttons">
          <button className="button primary">Try now</button>
          <button className="button secondary">Check documentation</button>
        </div>
      </div>
      <div className="right">
        <img className="figure" alt="hero" src="/terminal.png" />
      </div>
    </div>

    <style jsx>{`
      .hero {
        @apply text-gray-700
      }

      .hero .container {
        @apply mx-auto flex px-5 py-24 flex-col items-center
      }

      @screen md {
        .hero .container {
          @apply flex-row
        }
      }

      .hero .left {
        @apply flex flex-col mb-16 items-center text-center
      }

      @screen md {
        .hero .left {
          @apply w-1/2 pr-16 items-start text-left mb-0
        }
      }

      @screen lg {
        .hero .left {
          @apply flex-grow pr-24
        }
      }

      .hero .title {
        @apply text-3xl mb-4 font-medium text-gray-900
      }

      @screen md {
        .hero br {
          @apply inline-block
        }
      }

      .hero .leading {
        @apply mb-8 leading-relaxed
      }

      .hero .buttons {
        @apply flex justify-center
      }

      .hero .button {
        @apply inline-flex border-0 py-2 px-6 rounded text-lg
      }

      .hero .button:focus {
        @apply outline-none
      }

      .hero .button.primary {
        @apply text-white bg-indigo-500
      }

      .hero .button.primary:hover {
        @apply bg-indigo-600
      }

      .hero .button.secondary {
        @apply ml-4 text-gray-700 bg-gray-200
      }

      .hero .button.secondary:hover {
        @apply bg-gray-300
      }

      .hero .right {
        @apply w-5/6
      }

      @screen md {
        .hero .right {
          @apply w-1/2
        }
      }

      @screen lg {
        .hero .right {
          @apply max-w-lg w-full
        }
      }

      .hero .figure {
        @apply object-cover object-center rounded max-w-none -m-16
      }
    `}</style>
  </section>
}

Hero.propTypes = {
  title: PropTypes.oneOf([
    PropTypes.string,
    PropTypes.arrayOf(PropTypes.node)
  ]),
  leading: PropTypes.string
}

function Features ({ children }) {
  return <section className="features">
    <div className="container">
      <h1 className="heading">Features</h1>
      <div className="content">
        { children }
      </div>
    </div>

    <style jsx>{`
      .features {
        @apply text-gray-700
      }

      .features .container {
        @apply px-5 py-12 mx-auto
      }

      .features .heading {
        @apply text-2xl font-medium text-center text-gray-900 mb-20
      }

      @screen sm {
        .features .heading {
          @apply text-3xl
        }
      }

      .features .content {
        @apply flex flex-wrap -mx-4 -mb-10 -mt-4
      }

      @screen sm {
        .features .content {
          @apply -m-4
        }
      }
    `}</style>
  </section>
}

Features.propTypes = {
  children: PropTypes.node
}

function Feature ({ icon, title, leading, href }) {
  return <div className="feature">
    <div className="icon">
      <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="w-6 h-6" viewBox="0 0 24 24">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
      </svg>
    </div>
    <div className="content">
      <h2 className="title">{ title }</h2>
      <p className="leading">{ leading }</p>
      <a className="more" href={href} >Learn More
        <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="w-4 h-4 ml-2" viewBox="0 0 24 24">
          <path d="M5 12h14M12 5l7 7-7 7"></path>
        </svg>
      </a>
    </div>

    <style jsx>{`
      .feature {
        @apply p-4 mb-6 flex
      }

      @screen md {
        .feature {
          @apply p-4 w-1/3 mb-0
        }
      }

      .feature .icon {
        @apply w-12 h-12 inline-flex items-center justify-center rounded-full bg-indigo-100 text-indigo-500 mb-4 flex-shrink-0
      }

      .feature .content {
        @apply flex-grow pl-6
      }

      .feature .title {
        @apply text-gray-900 text-lg font-medium mb-2
      }

      .feature .leading {
        @apply leading-relaxed text-base
      }

      .feature .more {
        @apply mt-3 text-indigo-500 inline-flex items-center
      }
    `}</style>
  </div>
}

Feature.propTypes = {
  icon: PropTypes.string,
  title: PropTypes.string,
  leading: PropTypes.string,
  href: PropTypes.string
}

function Contact () {
  return <section className="contact">
    <div className="container">
      <div className="left">
        <iframe className="absolute inset-0" style={{ filter: 'grayscale(1) contrast(1.2) opacity(0.4)' }} title="map" marginHeight="0" marginWidth="0" scrolling="no" src="https://maps.google.com/maps?width=100%&amp;height=600&amp;hl=en&amp;q=%C4%B0zmir+(My%20Business%20Name)&amp;ie=UTF8&amp;t=&amp;z=14&amp;iwloc=B&amp;output=embed" width="100%" height="100%" frameBorder="0"></iframe>
        <div className="overlay">
          <div className="overlay_left">
            <h2 className="overlay_title">ADDRESS</h2>
            <p className="leading-relaxed">Photo booth tattooed prism, portland taiyaki hoodie neutra typewriter</p>
          </div>
          <div className="overlay_right">
            <h2 className="overlay_title">EMAIL</h2>
            <a className="leading-relaxed text-indigo-500">example@email.com</a>
            <h2 className="overlay_title mt-4">PHONE</h2>
            <p className="leading-relaxed">123-456-7890</p>
          </div>
        </div>
      </div>
      <div className="right">
        <h2 className="form_title">Contact us</h2>
        <p className="form_leading">
          We are very curious to hear what you think of the platform and what use cases you have for it.
        </p>
        <input className="form_field" placeholder="Name" type="text" />
        <input className="form_field" placeholder="Email" type="email" />
        <textarea className="form_textarea" placeholder="Message"></textarea>
        <button className="form_button">Button</button>
        {/* <p className="form_subtext">Chicharrones blog helvetica normcore iceland tousled brook viral artisan.</p> */}
      </div>
    </div>

    <style jsx>{`
      .contact {
        @apply text-gray-700 relative
      }

      .contact .container {
        @apply px-5 py-24 mx-auto flex flex-wrap
      }

      @screen sm {
        .contact .container {
          @apply flex-no-wrap
        }
      }

      .contact .left {
        @apply bg-gray-300 rounded-lg overflow-hidden p-10 flex items-end justify-start relative
      }

      @screen sm {
        .contact .left {
          @apply mr-10
        }
      }

      @screen md {
        .contact .left {
          @apply w-1/2
        }
      }

      @screen lg {
        .contact .left {
          @apply w-2/3
        }
      }

      .contact .overlay {
        @apply bg-white relative flex flex-wrap py-6
      }

      .contact .overlay_left {
        @apply px-6
      }

      .contact .overlay_right {
        @apply px-6 mt-4
      }

      @screen lg {
        .contact .overlay_left {
          @apply w-1/2
        }

        .contact .overlay_right {
          @apply w-1/2 mt-0
        }
      }

      .contact .overlay_title {
        @apply font-medium text-gray-900 tracking-widest text-sm
      }

      .contact .right {
        @apply bg-white flex flex-col w-full mt-8
      }

      @screen md {
        .contact .right {
          @apply w-1/2 ml-auto py-8 mt-0
        }
      }

      @screen lg {
        .contact .right {
          @apply w-1/3
        }
      }

      .contact .form_title {
        @apply text-gray-900 text-lg mb-1 font-medium
      }

      .contact .form_leading {
        @apply leading-relaxed mb-5 text-gray-600
      }

      .contact .form_field {
        @apply bg-white rounded border border-gray-400 text-base px-4 py-2 mb-4
      }

      .contact .form_textarea {
        @apply bg-white rounded border border-gray-400 h-40 text-base px-4 py-2 mb-4 resize-none
      }

      .contact .form_button {
        @apply text-white bg-indigo-500 border-0 py-2 px-6 rounded text-lg
      }

      .contact .form_field:focus,
      .contact .form_textarea:focus,
      .contact .form_button:focus {
        @apply outline-none border-indigo-500
      }

      .contact .form_button:hover {
        @apply border-indigo-600
      }

      .contact .form_subtext {
        @apply text-xs text-gray-500 mt-3
      }
    `}</style>
  </section>
}

export default function Home () {
  return (
    <div className="container mx-auto">
      <Head>
        <title>Agency</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Header />

      <Hero
        title={['General-purpose event-driven automation', 'without DSL']}
        leading="Write your rules as a code. Validate them immediately with static analysis. Keep your test alongside your code. Do it all from inside the browser or in the comfort of your terminal."
      />
      <Features>
        <Feature
          title="No DSL"
          leading="Learning new syntax every time new tool comes around is no fun. Even less fun to realize you can not do what you need to do with the syntax you have. So we decided to skip this part and let you write your rules in Javascript. And if you hate it, you can always write your own rule engine."
          href="http://localhost"
        />
        <Feature
          title="Clear audit trail"
          leading="No trigger and no execution should go unnoticed. Understanding what is going on under the hood is the first step in learning to trust your automation. Trust gives you peace of mind and allows you to focus on tasks you have not automated yet. Without trust, there's no automation, just extra work."
          href="http://localhost"
        />
        <Feature
          title="Custom actions in any language on any platform"
          leading="We strive to provide you with the widest set of integrations we can that you may need in your automation. We have our limits. That should not block you. You can write your own integration following our RPC protocol and run it anywhere."
          href="http://localhost"
        />
        <Feature
          title="Automate from inside the firewall"
          leading="Don't tell us secrets you don't want us to know. Don't give us access you don't want us to have. If your environment requires it, you can use Agency as a glorified message queue and run your sensors, triggers and rule engines in the safety of your private network."
          href="http://localhost"
        />
        <Feature
          title="Focus on automation"
          leading="We try to be a user-friendly turn-key solution for an increasing number of use cases. Our main goal however is to help engineers to focus on specifics of their domains and not have to worry about building and maintaining their own automation engine."
          href="http://localhost"
        />
        <Feature
          title="Access Control"
          leading="Blue bottle crucifix vinyl post-ironic four dollar toast vegan taxidermy. Gastropub indxgo juice poutine, ramps microdosing banh mi pug VHS try-hard ugh iceland kickstarter tumblr live-edge tilde."
          href="http://localhost"
        />
      </Features>
      <Contact />

      <Footer />
    </div>
  )
}
