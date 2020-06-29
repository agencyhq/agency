import Head from 'next/head'
import PropTypes from 'prop-types'

import Markdown from 'react-markdown'

import Header from '../../../components/header'
import Footer from '../../../components/footer'

function Table ({ cols, rows }) {
  return <table>
    <thead>
      <tr>
        {
          cols.map(c => <th key={c}>{ c }</th>)
        }
      </tr>
    </thead>
    <tbody>
      {
        rows.map((r, i) => {
          return <tr key={i}>
            {
              r.map((c, i) => <td key={i}>{ c }</td>)
            }
          </tr>
        })
      }
    </tbody>

    <style jsx>{`
      table {
        @apply table-auto border-collapse w-full
      }

      thead tr {
        @apply text-sm font-medium text-gray-700 text-left
      }

      thead th {
        @apply px-4 py-2 bg-gray-200
      }

      thead th:first-child {
        @apply rounded-l-lg
      }

      thead th:last-child {
        @apply rounded-r-lg
      }

      tbody {
        @apply text-sm font-normal text-gray-700
      }

      tbody tr {
        @apply border-b border-gray-200 py-4
      }

      tbody tr:hover {
        @apply bg-gray-100
      }

      tbody td {
        @apply px-4 py-4
      }
    `}</style>
  </table>
}

Table.propTypes = {
  cols: PropTypes.arrayOf(PropTypes.string),
  rows: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.string))
}

function Entity ({ name, description, properties }) {
  return <section>
    <h3 className="title text-lg">{ name }</h3>

    <Markdown source={ description } renderers={{
      paragraph: function Leading (props) {
        return <p className="leading" {...props} />
      }
    }}/>

    <Table
      cols={['Name', 'Type', 'Required', 'Description']}
      rows={properties.map(p => [
        p.name,
        p.type.names.join(' | '),
        p.optional ? '' : 'yes',
        p.description
      ])}
    />

    <style jsx>{`
      .leading {
        @apply leading-relaxed mb-8
      }

      .title {
        @apply font-medium text-gray-900 mt-4 mb-4
      }
    `}</style>
  </section>
}

Entity.propTypes = {
  name: PropTypes.string,
  description: PropTypes.string,
  properties: PropTypes.arrayOf(PropTypes.object)
}

export default function AdapterPage ({ jsdoc }) {
  const {
    name,
    description,
    params = []
  } = jsdoc.find(e => e.kind === 'module') || {}

  const triggers = jsdoc.filter(e => e.kind === 'Agency.Trigger')
  const actions = jsdoc.filter(e => e.kind === 'Agency.Action')

  return (
    <div className="container mx-auto">
      <Head>
        <title>Agency</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Header />

      <section className="article">
        <div className="container">
          <h2 className="title sm:text-3xl text-2xl">{ name }</h2>

          <Markdown source={ description } renderers={{
            paragraph: function Leading (props) {
              return <p className="leading" {...props} />
            }
          }}/>

          <h3 className="title text-xl">Environment variables</h3>
          <Table
            cols={['Name', 'Type', 'Required', 'Description']}
            rows={params.map(p => [
              p.name,
              p.type.names.join(' | '),
              p.optional ? '' : 'yes',
              p.description
            ])}
          />

          <h3 className="title text-xl">Triggers</h3>
          {
            triggers.map(e => <Entity key={e.name} {...e} />)
          }

          <h3 className="title text-xl">Actions</h3>
          {
            actions.map(e => <Entity key={e.name} {...e} />)
          }
        </div>

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
      </section>

      <Footer />
    </div>
  )
}

AdapterPage.propTypes = {
  jsdoc: PropTypes.object
}

export async function getStaticPaths () {
  return {
    paths: [{
      params: {
        name: 'telegram'
      }
    }],
    fallback: false
  }
}

export async function getStaticProps ({ params }) {
  const jsdoc = require(`./${params.name}.json`)

  return {
    props: {
      jsdoc
    }
  }
}
