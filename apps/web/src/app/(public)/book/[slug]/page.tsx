import BookingClient from './booking-client';

export function generateStaticParams() {
  return [
    { slug: 'winotosastro' },
    { slug: 'hotel-winotosastro' },
  ];
}

export default function BookingPage() {
  return <BookingClient />;
}
