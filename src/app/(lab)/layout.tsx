import NavigationHeader from '@/components/navigation-header';

/** Lab, blog and project pages keep the original header; the jack.exe home page has its own chrome. */
export default function LabLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <NavigationHeader />
      {children}
    </>
  );
}
