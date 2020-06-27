import PropTypes from 'prop-types'

import '../styles/index.css'

export default function MyApp ({ Component, pageProps }) {
  return <Component {...pageProps} />
}

MyApp.propTypes = {
  Component: PropTypes.elementType,
  pageProps: PropTypes.object
}
