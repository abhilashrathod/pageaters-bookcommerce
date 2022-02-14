import {NextPage} from "next";
import Link from "next/link";

const Home: NextPage = () => {
  return (
      <div className={'continer'}>
        <Link href={'/'}><a>back</a></Link>
        <h1>about</h1>
        <h2>Architecto expedita fugit laborum</h2>
        <h3>culpa delectus deleniti</h3>
        <h4>doloremque dolores earum enim</h4>
        <h5>optio placeat quas quis quo</h5>
        <h6>us similique tempora tempore</h6>
        <p>Lorem ipsum dolor sit amet, consectetur adipisicing elit. Architecto expedita fugit laborum, laudantium
          nesciunt unde! Cum delectus deleniti dicta, enim expedita fugiat id inventore iste iusto laboriosam libero,
          magni maiores modi nostrum numquam, pariatur placeat quasi quos rem sequi sit veritatis voluptates? Ab aliquid
          amet commodi culpa delectus deleniti dolores est harum id incidunt ipsam iure magnam modi nam nobis non,
          nostrum, nulla numquam odit officiis omnis optio placeat quas quis quo temporibus veniam voluptatibus? Aperiam
          beatae cum debitis doloremque dolores earum enim eum eveniet excepturi expedita, facilis magnam, magni numquam
          odit quibusdam quod quos repellendus similique tempora tempore voluptatem!</p>
      </div>
  )
};

export default Home
