import instagram from '../../assets/instagram_icon_localfibre.png'
import logo from '../../assets/logo_localfibre.png'

import './home.css'

export default function Home() {
    return (
        <div className='home'>
            <Logo />
            <Insta />
        </div>
    )
}

function Logo () { 
    return (
        <a href='https://www.instagram.com/localfibre/'>
            <img src={logo} 
                alt='logo'
                className='logo' 
                />
        </a>
        )
    }


function Insta () { 
    return (
        <a href='https://www.instagram.com/localfibre/'>
            <img src={instagram} 
                alt='instagram'
                className='instaLogo' 
                />
        </a>
        )
    }