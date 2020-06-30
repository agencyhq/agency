import Head from 'next/head'
import PropTypes from 'prop-types'

import Header from '../components/header'
import Footer from '../components/footer'

export default function UsagePage () {
  return (
    <div className="container mx-auto">
      <Head>
        <title>Agency</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Header />

      <section className="article">
        <div className="container">
          <h2 className="title sm:text-3xl text-2xl">Usage</h2>

          <p>Oh well...</p>
        </div>
      </section>

      <Footer />

      <style jsx>{`
        .article {
          @apply text-gray-700 overflow-hidden
        }

        .article .container {
          @apply px-5 py-24 mx-auto
        }

        .article .title {
          @apply font-medium text-gray-900 mt-4 mb-4
        }

        .article .leading {
          @apply leading-relaxed mb-8
        }
      `}</style>
    </div>
  )
}
