import React from 'react';

export const TeamPublicityPhoto: React.FC = () => {
  const [groupPhoto, setGroupPhoto] = React.useState<string | null>(null);
  React.useEffect(() => {
    let mounted = true;
    import('../services/driveService').then(({ DriveService }) => {
      const drive = new DriveService();
      drive.getKV('station-assets', 'stories').then((kv: any) => {
        if (!mounted) return;
        setGroupPhoto(kv?.teamPhotoNoBgUrl || kv?.groupPhotoUrl || null);
      }).catch(() => {});
    });
    return () => { mounted = false; };
  }, []);
  
  if (!groupPhoto) {
    return null;
  }

  return (
    <div className="relative">
      <div className="overflow-hidden rounded-lg border-2 border-slate-600 hover:border-red-500 transition-all duration-300 shadow-lg">
        <img
          src={groupPhoto}
          alt="News Team"
          className="h-16 w-auto object-cover hover:scale-105 transition-transform duration-300"
        />
      </div>
      
      {/* Subtle overlay with station branding */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent rounded-b-lg">
        <div className="text-white text-xs font-medium px-2 py-1 text-center">
          Your News Team
        </div>
      </div>
    </div>
  );
}; 
