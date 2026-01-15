import BorrowForm from "../components/BorrowForm.jsx";

export default function BorrowPage() {
  return (
    <section className="card">
      <h2>Borrow a Book</h2>
      <p className="muted">
        Scan or type the student ID and book code, then save. The system will create a new borrow
        record.
      </p>
      <BorrowForm />
    </section>
  );
}

