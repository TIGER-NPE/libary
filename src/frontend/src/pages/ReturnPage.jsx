import ReturnForm from "../components/ReturnForm.jsx";

export default function ReturnPage() {
  return (
    <section className="card">
      <h2>Return a Book</h2>
      <p className="muted">
        Scan or type the student ID and book code. The system will find the latest active borrow
        record and mark it as returned.
      </p>
      <ReturnForm />
    </section>
  );
}

