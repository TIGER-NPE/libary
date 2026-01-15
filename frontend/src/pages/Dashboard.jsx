import { Link } from "react-router-dom";

export default function Dashboard() {
  return (
    <section className="card">
      <h2>Welcome</h2>
      <p className="muted">
        Use this simple system to record when students borrow and return books. It works on
        phones, tablets, and desktop, and can be installed as an app.
      </p>
      <ul>
        <li>
          <Link to="/borrow"><button> Borrow a Book</button></Link>
        </li>
        <li>
          <Link to="/return"> <button>Return a Book</button></Link>
        </li>
        <li>
          <Link to="/borrowed"><button> View Currently Borrowed Books</button></Link>
        </li>
      </ul>
    </section>
  );
}

