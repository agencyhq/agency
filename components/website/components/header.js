import Logo from './logo'

export default function Header () {
  return <header>
    <div className="container">
      <a className="logo">
        <Logo />
        <span className="name">Agency</span>
      </a>
      <nav className="menu">
        <a className="menu_button">Introduction</a>
        <a className="menu_button">Usage</a>
        <a className="menu_button">Documentation</a>
      </nav>
      <button className="side_button">
        Try it out
      </button>
    </div>

    <style jsx>{`
      header {
        @apply text-gray-700
      }

      header .container {
        @apply mx-auto flex flex-wrap p-5 flex-col items-center;
      }

      @screen md {
        header .container {
          @apply flex-row
        }
      }

      header .logo {
        @apply flex font-medium items-center text-gray-900 mb-4;
      }

      @screen md {
        header .logo {
          @apply mb-0
        }
      }

      header .name {
        @apply ml-3 text-xl;
      }

      header .menu {
        @apply flex flex-wrap items-center text-base justify-center;
      }

      @screen md {
        header .menu {
          @apply ml-auto
        }
      }

      header .menu_button {
        @apply mr-5 cursor-pointer
      }

      header .menu_button:hover {
        @apply text-gray-900
      }

      header .side_button {
        @apply inline-flex items-center bg-gray-200 border-0 py-1 px-3 rounded text-base mt-4
      }

      @screen md {
        header .side_button {
          @apply mt-0
        }
      }

      header .side_button:hover {
        @apply bg-gray-300
      }

      header .side_button:focus {
        @apply outline-none
      }
    `}</style>
  </header>
}
