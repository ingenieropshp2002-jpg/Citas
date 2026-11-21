'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { RegisterForm } from './RegisterForm';
function Form() { return <RegisterForm next={useSearchParams().get('next') || '/'} />; }
export default function Registro() {
  return <main className="min-h-screen flex flex-col justify-center px-margin py-10 max-w-md mx-auto"><h1 className="font-headline-lg-mobile text-headline-lg-mobile text-primary-container dark:text-primary mb-6">Crea tu cuenta</h1><Suspense><Form /></Suspense></main>;
}
