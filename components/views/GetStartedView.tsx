
import React, { useState, useCallback } from 'react';
import { 
    CheckCircleIcon, XIcon, InformationCircleIcon, KeyIcon, CreditCardIcon, LightbulbIcon,
    ImageIcon, VideoIcon, MegaphoneIcon, RobotIcon, LibraryIcon, SettingsIcon,
    GalleryIcon, AlertTriangleIcon, ChevronLeftIcon, ChevronRightIcon
} from '../Icons';
// FIX: Add missing Language type for component props.
import { type Language } from '../../types';


// --- Video Slideshow Data ---
// User: You can replace the title and src for each video below.
// Place your video files in a 'public/videos' folder if they don't exist.
const slideshowVideos = [
  {
    title: "Video 1: Platform Overview",
    src: "https://monoklix.com/wp-content/uploads/2025/11/WhatsApp-Video-2025-11-13-at-10.41.36-PM.mp4",
  },
  {
    title: "Video 2: AI Image Suite",
    src: "https://monoklix.com/wp-content/uploads/2025/11/WhatsApp-Video-2025-11-13-at-10.41.37-PM.mp4",
  },
  {
    title: "Video 3: AI Video Suite",
    src: "https://monoklix.com/wp-content/uploads/2025/11/WhatsApp-Video-2025-11-13-at-10.41.37-PM-1.mp4",
  },
  {
    title: "Video 4: Content Ideas",
    src: "https://monoklix.com/wp-content/uploads/2025/11/WhatsApp-Video-2025-11-13-at-10.41.36-PM-1.mp4",
  },
  {
    title: "Video 5: Prompt Gallery",
    src: "https://monoklix.com/wp-content/uploads/2025/11/WhatsApp-Video-2025-11-13-at-10.41.37-PM-2.mp4",
  },
];


const Section: React.FC<{ title: string; children: React.ReactNode; icon?: React.ComponentType<{ className?: string }> }> = ({ title, children, icon: Icon }) => (
    <div className="py-8 sm:py-10 border-b border-neutral-100 dark:border-neutral-800 last:border-b-0">
        <h3 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white mb-4 sm:mb-6 flex items-center gap-3 sm:gap-4">
            {Icon && (
                <div className="p-2 bg-brand-start/10 rounded-xl">
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-brand-start flex-shrink-0" />
                </div>
            )}
            {title}
        </h3>
        <div className="space-y-4 sm:space-y-5 text-neutral-600 dark:text-neutral-300 text-sm sm:text-base leading-relaxed pl-1 sm:pl-14">{children}</div>
    </div>
);

const SubSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="mt-6 sm:mt-8 bg-neutral-50 dark:bg-neutral-800/30 p-5 sm:p-6 rounded-2xl border border-neutral-100 dark:border-neutral-800">
        <h4 className="text-base sm:text-lg font-bold text-neutral-800 dark:text-neutral-100 mb-3">{title}</h4>
        <div className="space-y-3 text-xs sm:text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{children}</div>
    </div>
);

interface GetStartedViewProps {
    // FIX: Add missing 'language' prop to satisfy component signature in App.tsx.
    language: Language;
}

const GetStartedView: React.FC<GetStartedViewProps> = () => {
    const [currentSlide, setCurrentSlide] = useState(0);

    const nextSlide = useCallback(() => {
        setCurrentSlide(prev => (prev === slideshowVideos.length - 1 ? 0 : prev + 1));
    }, []);

    const prevSlide = useCallback(() => {
        setCurrentSlide(prev => (prev === 0 ? slideshowVideos.length - 1 : prev - 1));
    }, []);

    const goToSlide = (index: number) => {
        setCurrentSlide(index);
    };


    return (
        <div className="max-w-5xl mx-auto pb-20">
            {/* Video Slideshow Section */}
            <div className="mb-10 sm:mb-12 bg-white dark:bg-neutral-900 p-6 sm:p-8 rounded-3xl shadow-soft border border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                    <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white">Video Tutorials</h2>
                    <span className="text-xs sm:text-sm font-medium text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-3 py-1 rounded-full">
                        {currentSlide + 1} / {slideshowVideos.length}
                    </span>
                </div>
                
                <div className="relative group rounded-2xl overflow-hidden shadow-lg bg-black">
                    <video 
                        key={slideshowVideos[currentSlide].src} 
                        src={slideshowVideos[currentSlide].src} 
                        controls 
                        autoPlay 
                        muted 
                        loop 
                        playsInline
                        className="w-full aspect-video object-contain"
                    />
                    
                    {/* Navigation Buttons */}
                    <button 
                        onClick={prevSlide} 
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 backdrop-blur-md border border-white/20 text-white p-2 sm:p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-white/20 hover:scale-110 focus:outline-none"
                        aria-label="Previous video"
                    >
                        <ChevronLeftIcon className="w-5 h-5 sm:w-6 sm:h-6"/>
                    </button>
                    <button 
                        onClick={nextSlide} 
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 backdrop-blur-md border border-white/20 text-white p-2 sm:p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-white/20 hover:scale-110 focus:outline-none"
                        aria-label="Next video"
                    >
                        <ChevronRightIcon className="w-5 h-5 sm:w-6 sm:h-6"/>
                    </button>
                </div>
                
                <div className="mt-4 sm:mt-6 flex flex-col items-center">
                    <h3 className="text-base sm:text-lg font-bold text-neutral-800 dark:text-white mb-3 sm:mb-4">{slideshowVideos[currentSlide].title}</h3>
                    
                    {/* Slide Indicators */}
                    <div className="flex justify-center gap-1.5 sm:gap-2">
                        {slideshowVideos.map((_, index) => (
                            <button 
                                key={index} 
                                onClick={() => goToSlide(index)}
                                className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 ${currentSlide === index ? 'w-6 sm:w-8 bg-brand-start' : 'w-1.5 sm:w-2 bg-neutral-300 dark:bg-neutral-700 hover:bg-neutral-400'}`}
                                aria-label={`Go to video ${index + 1}`}
                            />
                        ))}
                    </div>
                </div>
            </div>


            <div className="text-center mb-10 sm:mb-16">
                <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-neutral-900 dark:text-white tracking-tight mb-3 sm:mb-4">
                    Panduan Mula
                </h1>
                <p className="text-sm sm:text-lg text-neutral-500 dark:text-neutral-400 max-w-2xl mx-auto">
                    Panduan komprehensif anda untuk menguasai platform AI MONOklix.com.
                </p>
            </div>

            <div className="bg-white dark:bg-neutral-900 p-6 sm:p-12 rounded-3xl shadow-soft border border-neutral-100 dark:border-neutral-800">

                <Section title="Gambaran Keseluruhan: Cara MONOklix Berfungsi" icon={InformationCircleIcon}>
                    <p className="text-base sm:text-lg">Sebelum anda bermula, penting untuk memahami dua bahagian perkhidmatan kami. Fikirkan platform kami seperti kereta berprestasi tinggi:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                        <div className="bg-blue-50 dark:bg-blue-900/10 p-5 rounded-xl border border-blue-100 dark:border-blue-900/30">
                            <h5 className="font-bold text-brand-start mb-2">🚗 Platform MONOklix (Kereta)</h5>
                            <p className="text-xs sm:text-sm">Akaun anda memberi anda akses kepada papan pemuka, alatan (seperti Suite Imej dan Video), dan garaj (Galeri anda). Anda berada di tempat duduk pemandu.</p>
                        </div>
                        <div className="bg-purple-50 dark:bg-purple-900/10 p-5 rounded-xl border border-purple-100 dark:border-purple-900/30">
                            <h5 className="font-bold text-brand-end mb-2">⛽ Token MONOklix (Bahan Api)</h5>
                            <p className="text-xs sm:text-sm">Untuk membuat kereta bergerak (untuk menjana kandungan), anda memerlukan bahan api. Ini disediakan oleh enjin AI Google yang berkuasa, dan ia memerlukan **Token** untuk diakses.</p>
                        </div>
                    </div>
                    <p>Panduan ini akan menerangkan bagaimana "bahan api" disediakan secara automatik dan bagaimana perkhidmatan ini berfungsi.</p>
                </Section>

                <Section title="Bab 1: Akaun & Token" icon={KeyIcon}>
                    <SubSection title="Cara Log Masuk">
                        <p>Platform ini menggunakan sistem log masuk yang mudah dan tanpa kata laluan. Hanya masukkan alamat e-mel yang anda gunakan untuk pendaftaran di laman web utama kami dan klik 'Log Masuk'. Sesi anda akan disimpan secara automatik.</p>
                    </SubSection>
                    <SubSection title="Token: Automatik Sepenuhnya!">
                        <p className="font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg inline-block mb-2 text-xs sm:text-sm">Berita baik: Anda tidak perlu mendapatkan atau mengurus token anda sendiri.</p>
                        <p>Platform MONOklix menguruskan semuanya untuk anda. Apabila anda log masuk, sistem secara automatik memuatkan token pusat yang dikongsi yang memberi anda akses kepada semua ciri AI. Anda boleh mengesahkan token itu aktif dengan mencari ikon <KeyIcon className="w-4 h-4 inline-block text-green-500" /> di penjuru kanan atas skrin.</p>
                        <p>Sistem ini memastikan anda mempunyai pengalaman yang lancar tanpa sebarang persediaan yang rumit.</p>
                    </SubSection>
                </Section>
                
                <Section title="Bab 2: Memahami Kos & Pengebilan" icon={CreditCardIcon}>
                    <p className="font-semibold text-neutral-800 dark:text-neutral-200">MONOklix.com beroperasi berdasarkan langganan, yang merangkumi akses anda ke platform dan kos penggunaan AI.</p>
                    <ul className="space-y-3 mt-4">
                        <li className="flex gap-3"><span className="w-1.5 h-1.5 rounded-full bg-neutral-400 mt-2 flex-shrink-0"></span><span><strong>Tiada Pengebilan Setiap Penggunaan:</strong> Anda tidak dibilkan untuk setiap imej atau video yang anda jana. Status akaun anda (cth., Seumur Hidup, Langganan) menentukan akses anda kepada ciri-ciri AI.</span></li>
                        <li className="flex gap-3"><span className="w-1.5 h-1.5 rounded-full bg-neutral-400 mt-2 flex-shrink-0"></span><span><strong>Polisi Penggunaan Adil:</strong> Walaupun kami tidak mempunyai had yang ketat, perkhidmatan ini tertakluk kepada polisi penggunaan adil untuk memastikan prestasi yang stabil untuk semua pengguna. Token unik anda mempunyai kuota harian yang tinggi, yang lebih daripada mencukupi untuk kegunaan profesional.</span></li>
                        <li className="flex gap-3"><span className="w-1.5 h-1.5 rounded-full bg-neutral-400 mt-2 flex-shrink-0"></span><span><strong>Anda Mengawal Sepenuhnya:</strong> Akses anda diuruskan sepenuhnya melalui status akaun anda di MONOklix.com. Anda tidak memerlukan akaun Google Cloud atau persediaan pengebilan yang berasingan.</span></li>
                    </ul>
                </Section>
                
                <Section title="Bab 3: Suite Idea Kandungan AI" icon={LightbulbIcon}>
                    <p>Suite ini direka untuk membantu anda sumbang saran dan mencipta kandungan bertulis untuk keperluan pemasaran anda.</p>
                     <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <li className="bg-neutral-50 dark:bg-neutral-800/30 p-4 rounded-xl text-xs sm:text-sm"><strong className="block text-brand-start mb-1">Staf MONOklix</strong> Satu pasukan ejen AI khusus. Pilih ejen (seperti Penyelidik Pasaran atau Penulis Iklan), berikan input anda, dan dapatkan output peringkat pakar untuk tugas-tugas tertentu.</li>
                        <li className="bg-neutral-50 dark:bg-neutral-800/30 p-4 rounded-xl text-xs sm:text-sm"><strong className="block text-brand-start mb-1">Idea Kandungan</strong> Atasi kebuntuan kreatif dengan memasukkan topik. AI menggunakan Carian Google untuk mencari trend semasa dan menjana 5 idea kandungan segar dengan tajuk dan penerangan.</li>
                        <li className="bg-neutral-50 dark:bg-neutral-800/30 p-4 rounded-xl text-xs sm:text-sm"><strong className="block text-brand-start mb-1">Teks Pemasaran</strong> Cipta teks pemasaran yang meyakinkan untuk iklan, media sosial, atau laman web. Hanya terangkan produk, sasaran audiens, dan nada yang dikehendaki.</li>
                        <li className="bg-neutral-50 dark:bg-neutral-800/30 p-4 rounded-xl text-xs sm:text-sm"><strong className="block text-brand-start mb-1">Penjana Jalan Cerita</strong> Titik permulaan yang sempurna untuk iklan video. Muat naik imej produk, tulis penerangan ringkas, dan AI akan menjana konsep papan cerita 1 babak yang lengkap.</li>
                    </ul>
                </Section>
                
                <Section title="Bab 4: Suite Imej AI" icon={ImageIcon}>
                    <p>Suite ini mengandungi alat yang berkuasa untuk mencipta dan memanipulasi imej.</p>
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-6 border border-green-200 dark:border-green-800 rounded-2xl bg-green-50/50 dark:bg-green-900/10">
                            <h5 className="font-bold text-green-700 dark:text-green-400 flex items-center gap-2 mb-3 text-sm sm:text-base">
                                <CheckCircleIcon className="w-5 h-5" />
                                Apa yang Ia Boleh Lakukan
                            </h5>
                            <ul className="space-y-2 text-xs sm:text-sm text-neutral-700 dark:text-neutral-300">
                                <li>• Menjana imej baru dari teks (Teks-ke-Imej).</li>
                                <li>• Mengedit imej sedia ada menggunakan arahan teks (Imej-ke-Imej).</li>
                                <li>• Meletakkan produk anda ke dalam latar belakang studio profesional.</li>
                                <li>• Mencipta foto model realistik menggunakan produk anda.</li>
                                <li>• Meningkatkan resolusi imej dan mempertingkatkan warna.</li>
                                <li>• Membuang latar belakang dari foto.</li>
                            </ul>
                        </div>
                        <div className="p-6 border border-red-200 dark:border-red-800 rounded-2xl bg-red-50/50 dark:bg-red-900/10">
                            <h5 className="font-bold text-red-600 dark:text-red-400 flex items-center gap-2 mb-3 text-sm sm:text-base">
                                <XIcon className="w-5 h-5" />
                                Apa yang Ia Tidak Boleh Lakukan
                            </h5>
                            <ul className="space-y-2 text-xs sm:text-sm text-neutral-700 dark:text-neutral-300">
                                <li>• Menjana imej dengan teks tertentu yang boleh dibaca.</li>
                                <li>• Meniru logo atau tanda jenama yang kompleks dengan sempurna.</li>
                                <li>• Mencipta wajah fotorealistik selebriti terkenal disebabkan oleh dasar keselamatan.</li>
                                <li>• Menjamin tangan atau bentuk anatomi yang sempurna dalam setiap penjanaan.</li>
                            </ul>
                        </div>
                    </div>
                     <SubSection title="Memahami Penapis Keselamatan">
                        <p>Semua penjanaan imej dan teks AI tertakluk kepada penapis keselamatan Google. Permintaan anda mungkin disekat jika ia mengandungi kandungan yang berkaitan dengan:</p>
                         <ul className="list-disc pl-5 space-y-1 font-medium text-neutral-800 dark:text-neutral-200 mt-2 text-xs sm:text-sm">
                            <li>Ucapan kebencian, gangguan, atau keganasan.</li>
                            <li>Mencederakan diri sendiri.</li>
                            <li>Bahan lucah secara eksplisit.</li>
                        </ul>
                        <p className="mt-3 text-neutral-500">Jika permintaan anda disekat, cuba permudahkan prompt anda atau gunakan imej yang berbeza. Kami tidak boleh melumpuhkan penapis keselamatan ini.</p>
                    </SubSection>
                </Section>

                <Section title="Bab 5: Suite Video & Suara AI" icon={VideoIcon}>
                    <p className="text-base sm:text-lg mb-4">Cipta video yang menakjubkan dan suara latar profesional dengan mudah.</p>
                    <div className="grid grid-cols-1 gap-6">
                        <SubSection title="Penjanaan Video">
                            <p>Cipta video dari prompt teks. Anda juga boleh menyediakan imej permulaan. AI akan menganimasikan imej tersebut berdasarkan prompt anda. Untuk hasil terbaik, gunakan prompt deskriptif yang memperincikan babak dan aksi.</p>
                            <p className="mt-2 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-neutral-400">Terbaik Untuk: Klip media sosial pendek</p>
                        </SubSection>
                        <SubSection title="Papan Cerita Video">
                            <p>Ini adalah aliran kerja 2 langkah yang berkuasa untuk mencipta video ulasan produk. Dalam Langkah 1, anda menyediakan butiran produk dan arahan kreatif untuk menjana skrip papan cerita 4 babak. Dalam Langkah 2, AI menjana imej unik untuk setiap babak berdasarkan skrip.</p>
                            <p className="mt-2 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-neutral-400">Terbaik Untuk: Iklan produk lengkap</p>
                        </SubSection>
                        <SubSection title="Penggabung Video">
                            <p>Jahit beberapa klip video dari Galeri anda menjadi satu video. Pilih video yang ingin anda gabungkan mengikut urutan yang anda mahu ia muncul.</p>
                            <p>Pemprosesan dilakukan sepenuhnya dalam penyemak imbas anda, jadi ia peribadi dan pantas untuk klip pendek. (Pengguna Admin/Seumur Hidup sahaja)</p>
                        </SubSection>
                        <SubSection title="Studio Suara">
                            <p>Tukar sebarang teks menjadi suara latar profesional. Tulis skrip anda, pilih dari pelbagai pelakon suara (termasuk Bahasa Malaysia), dan laraskan kelajuan, pic, dan kelantangan.</p>
                            <p>Outputnya adalah fail WAV yang boleh anda gunakan dalam mana-mana editor video.</p>
                        </SubSection>
                    </div>
                </Section>
                
                <Section title="Bab 6: Memahami Model AI" icon={RobotIcon}>
                    <p>Platform ini menggunakan beberapa model AI Google yang berbeza, setiap satu dikhususkan untuk tugas tertentu.</p>
                    <div className="space-y-4 mt-6">
                        <div className="border-l-4 border-brand-start pl-4">
                            <h5 className="font-bold text-neutral-800 dark:text-neutral-100 text-sm sm:text-base">Gemini 2.5 Flash (Teks & Multimodal)</h5>
                            <p className="text-xs sm:text-sm mt-1">Model kerja utama untuk penjanaan teks dan pemahaman imej. Dioptimumkan untuk kelajuan tanpa bajet 'berfikir'.</p>
                        </div>
                        <div className="border-l-4 border-purple-500 pl-4">
                            <h5 className="font-bold text-neutral-800 dark:text-neutral-100 text-sm sm:text-base">Veo Models (Video)</h5>
                            <p className="text-xs sm:text-sm mt-1">Model utama Google untuk video. Kami menggunakan versi standard (kualiti tertinggi) dan versi pantas (hasil cepat).</p>
                        </div>
                        <div className="border-l-4 border-pink-500 pl-4">
                            <h5 className="font-bold text-neutral-800 dark:text-neutral-100 text-sm sm:text-base">Imagen V3 & 4 (Imej)</h5>
                            <p className="text-xs sm:text-sm mt-1">Imagen V3 digunakan untuk penyuntingan/komposisi. Imagen 4 digunakan untuk penjanaan Teks-ke-Imej berkualiti tinggi.</p>
                        </div>
                    </div>
                    <SubSection title="Bolehkah Saya Mencipta Video Dengan Suara Saya Sendiri?">
                        <p>Tidak secara langsung semasa penjanaan video. Ciri suara latar AI terbina dalam alat Papan Cerita Video pada masa ini menyokong set bahasa yang terhad.</p>
                        <p>Untuk suara latar tersuai, kami amat mengesyorkan menggunakan alat 'Studio Suara' untuk menjana fail audio, dan kemudian menggabungkannya dengan video yang anda jana dalam aplikasi penyuntingan video yang berasingan.</p>
                    </SubSection>
                </Section>

                <Section title="Bab 7: Prompt & Perpustakaan" icon={LibraryIcon}>
                    <p>Suite Perpustakaan Prompt adalah hab anda untuk inspirasi dan formula prompt yang terbukti.</p>
                    <SubSection title="Cara Menggunakan Perpustakaan">
                        <p>Suite ini kini hanya menampilkan satu perpustakaan utama:</p>
                        <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm mt-2 mb-4">
                            <li dangerouslySetInnerHTML={{ __html: "<strong>Prompt Nano Banana:</strong> Koleksi prompt kreatif serba guna untuk penjanaan dan penyuntingan imej, yang bersumber dari projek komuniti sumber terbuka. Ini bagus untuk meneroka kemungkinan kreatif AI."}}></li>
                        </ul>
                        <p>Dalam perpustakaan, anda boleh melayari contoh-contoh. Apabila anda menjumpai yang anda suka, hanya klik butang 'Guna Prompt Ini'. Ini akan secara automatik menyalin prompt dan membawa anda ke alat Penjanaan Imej AI dengan prompt yang telah diisi, jadi anda boleh menjananya dengan segera atau menyesuaikannya lebih lanjut.</p>
                    </SubSection>
                </Section>
                        
                <Section title="Bab 8: Galeri, Sejarah, dan Log" icon={GalleryIcon}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="col-span-2">
                            <SubSection title="Galeri & Sejarah">
                                <p>Setiap kandungan yang anda jana—imej, video, audio, dan teks—disimpan secara automatik ke storan penyemak imbas peranti anda (IndexedDB). Anda boleh mengakses semuanya di bahagian 'Galeri & Sejarah'. Dari sini, anda boleh melihat, memuat turun, atau menggunakan semula aset anda.</p>
                            </SubSection>
                        </div>
                        <div className="col-span-1">
                            <SubSection title="Storan Tempatan">
                                <p className="text-[10px] sm:text-xs">Data disimpan dalam penyemak imbas anda. Membersihkan cache akan memadamkan galeri anda. Kami tidak menyimpan kandungan anda di pelayan.</p>
                            </SubSection>
                        </div>
                    </div>
                    <SubSection title="Log API AI (Untuk Debugging)">
                        <p>Log API ialah rekod teknikal setiap permintaan. Ia berguna jika penjanaan gagal, kerana ia menunjukkan mesej ralat sebenar dari Google (contohnya, sekatan keselamatan).</p>
                    </SubSection>
                </Section>

                <Section title="Bab 9: Penyelesaian Masalah Ralat Biasa" icon={AlertTriangleIcon}>
                    <p>Jika anda menghadapi ralat, ia biasanya disebabkan oleh salah satu daripada beberapa isu biasa. Berikut ialah panduan ringkas tentang maksudnya dan cara menyelesaikannya.</p>
                    <div className="mt-8 overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                        <table className="w-full text-xs sm:text-sm text-left border-collapse">
                            <thead className="text-[10px] sm:text-xs text-neutral-500 uppercase bg-neutral-50 dark:bg-neutral-800 dark:text-neutral-400">
                                <tr>
                                    <th scope="col" className="px-4 py-3 sm:px-6 sm:py-4 font-bold tracking-wider">Masalah / Kod Ralat</th>
                                    <th scope="col" className="px-4 py-3 sm:px-6 sm:py-4 font-bold tracking-wider">Punca Kemungkinan</th>
                                    <th scope="col" className="px-4 py-3 sm:px-6 sm:py-4 font-bold tracking-wider">Penyelesaian</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 bg-white dark:bg-neutral-900">
                                <tr className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"><td className="px-4 py-3 sm:px-6 sm:py-4 align-top font-semibold text-red-600">E-mel tidak berdaftar</td><td className="px-4 py-3 sm:px-6 sm:py-4 align-top">Pengguna memasukkan e-mel yang tidak wujud dalam pangkalan data.</td><td className="px-4 py-3 sm:px-6 sm:py-4 align-top" dangerouslySetInnerHTML={{ __html: "1. Semak semula ejaan e-mel.<br/>2. Pastikan pengguna telah mendaftar di laman web utama (monoklix.com).<br/>3. Jika masih gagal, hubungi admin untuk menyemak status akaun." }}></td></tr>
                                <tr className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"><td className="px-4 py-3 sm:px-6 sm:py-4 align-top font-semibold text-red-600">Akaun tidak aktif (inactive)</td><td className="px-4 py-3 sm:px-6 sm:py-4 align-top">Status pengguna telah ditukar kepada tidak aktif oleh admin.</td><td className="px-4 py-3 sm:px-6 sm:py-4 align-top">Hubungi admin untuk pengaktifan semula akaun.</td></tr>
                                <tr className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"><td className="px-4 py-3 sm:px-6 sm:py-4 align-top font-semibold text-yellow-600">401 Unauthorized / 403 Permission Denied</td><td className="px-4 py-3 sm:px-6 sm:py-4 align-top" dangerouslySetInnerHTML={{ __html: "Token mungkin tidak sah, tamat tempoh, atau disekat oleh Google." }}></td><td className="px-4 py-3 sm:px-6 sm:py-4 align-top" dangerouslySetInnerHTML={{ __html: "Ini adalah isu di pihak platform. Sila laporkan kepada admin dengan segera melalui butang 'Lapor kepada Admin' pada tetingkap ralat atau melalui WhatsApp." }}></td></tr>
                                <tr className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"><td className="px-4 py-3 sm:px-6 sm:py-4 align-top font-semibold text-yellow-600">429 Resource Exhausted</td><td className="px-4 py-3 sm:px-6 sm:py-4 align-top">Platform telah mencapai had penggunaan (rate limit) API yang dikongsi.</td><td className="px-4 py-3 sm:px-6 sm:py-4 align-top" dangerouslySetInnerHTML={{ __html: "Ini biasanya isu sementara. Sila tunggu beberapa minit dan cuba lagi. Admin akan dimaklumkan untuk meningkatkan had jika perlu." }}></td></tr>
                                <tr className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"><td className="px-4 py-3 sm:px-6 sm:py-4 align-top font-semibold text-yellow-600">500 Internal Server Error / 503 Service Unavailable</td><td className="px-4 py-3 sm:px-6 sm:py-4 align-top">Terdapat ralat dalaman atau penyelenggaraan pada pelayan Google. Ini adalah isu sementara dan bukan berpunca daripada akaun atau prompt anda.</td><td className="px-4 py-3 sm:px-6 sm:py-4 align-top" dangerouslySetInnerHTML={{ __html: "1. Ini biasanya isu sementara. Sila tunggu beberapa minit dan cuba semula permintaan anda.<br/>2. Jika masalah berterusan, semak status Token atau hubungi admin." }}></td></tr>
                                <tr className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"><td className="px-4 py-3 sm:px-6 sm:py-4 align-top font-semibold">Ralat Rangkaian (Network Error)</td><td className="px-4 py-3 sm:px-6 sm:py-4 align-top">Sambungan internet anda terputus, atau terdapat sesuatu (seperti perisian firewall atau ad-blocker) yang menghalang aplikasi daripada menghubungi pelayan Google.</td><td className="px-4 py-3 sm:px-6 sm:py-4 align-top" dangerouslySetInnerHTML={{ __html: "1. Semak sambungan internet anda.<br/>2. Cuba muat semula (refresh) halaman.<br/>3. Lumpuhkan sementara sebarang perisian ad-blocker atau VPN dan cuba lagi." }}></td></tr>
                                <tr className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"><td className="px-4 py-3 sm:px-6 sm:py-4 align-top font-semibold">Penjanaan Video (Veo) gagal tetapi servis lain berfungsi.</td><td className="px-4 py-3 sm:px-6 sm:py-4 align-top">Model Veo memerlukan token pengesahan khas (__SESSION) yang berbeza daripada Kunci API Gemini biasa. Token ini mungkin telah tamat tempoh.</td><td className="px-4 py-3 sm:px-6 sm:py-4 align-top" dangerouslySetInnerHTML={{ __html: "Ini adalah isu platform. Sila laporkan kepada admin supaya token baharu boleh dikemas kini." }}></td></tr>
                                <tr className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"><td className="px-4 py-3 sm:px-6 sm:py-4 align-top font-semibold text-blue-600">400 Bad Request / Mesej ralat 'Safety Filter'</td><td className="px-4 py-3 sm:px-6 sm:py-4 align-top">Prompt (arahan teks) atau imej yang dimuat naik telah disekat oleh penapis keselamatan Google kerana kandungan yang mungkin sensitif.</td><td className="px-4 py-3 sm:px-6 sm:py-4 align-top" dangerouslySetInnerHTML={{ __html: "1. Permudahkan prompt anda. Elakkan perkataan yang terlalu deskriptif atau yang boleh disalah tafsir.<br/>2. Jika menggunakan imej, cuba gunakan imej yang berbeza dan lebih neutral.<br/>3. Rujuk Panduan Mula &gt; Bab 3 untuk memahami jenis kandungan yang disekat." }}></td></tr>
                                <tr className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"><td className="px-4 py-3 sm:px-6 sm:py-4 align-top font-semibold">Penjanaan video mengambil masa lama atau gagal tanpa ralat jelas.</td><td className="px-4 py-3 sm:px-6 sm:py-4 align-top">Model Veo sememangnya mengambil masa beberapa minit untuk menjana video. Kegagalan senyap selalunya disebabkan oleh sekatan polisi keselamatan pada prompt atau imej.</td><td className="px-4 py-3 sm:px-6 sm:py-4 align-top" dangerouslySetInnerHTML={{ __html: "1. Sila bersabar dan tunggu sehingga 5-10 minit.<br/>2. Jika masih gagal, cuba permudahkan prompt atau gunakan imej rujukan yang berbeza.<br/>3. Semak Log API AI (dalam Galeri) untuk melihat jika ada mesej ralat teknikal." }}></td></tr>
                                <tr className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"><td className="px-4 py-3 sm:px-6 sm:py-4 align-top font-semibold">Imej yang dihasilkan tidak seperti yang dijangka</td><td className="px-4 py-3 sm:px-6 sm:py-4 align-top">Prompt yang diberikan kepada model AI mungkin kurang jelas atau boleh ditafsir dalam pelbagai cara.</td><td className="px-4 py-3 sm:px-6 sm:py-4 align-top">Jadikan prompt anda lebih spesifik. Contoh: Daripada 'tambah topi', cuba 'letakkan topi berwarna merah pada kepala orang di dalam imej ini'.</td></tr>
                                <tr className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"><td className="px-4 py-3 sm:px-6 sm:py-4 align-top font-semibold">Galeri tidak menyimpan hasil janaan terbaru.</td><td className="px-4 py-3 sm:px-6 sm:py-4 align-top">Pangkalan data tempatan (IndexedDB) dalam pelayar mungkin mengalami `deadlock` atau rosak.</td><td className="px-4 py-3 sm:px-6 sm:py-4 align-top" dangerouslySetInnerHTML={{ __html: "1. Lakukan `hard refresh` pada pelayar (Ctrl + Shift + R).<br/>2. Jika masalah berterusan, pergi ke Tetapan &gt; Profil &gt; Pengurus Cache Video dan klik 'Kosongkan Semua Cache'." }}></td></tr>
                                <tr className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"><td className="px-4 py-3 sm:px-6 sm:py-4 align-top font-semibold">Penggabung Video gagal berfungsi.</td><td className="px-4 py-3 sm:px-6 sm:py-4 align-top" dangerouslySetInnerHTML={{ __html: "1. Pustaka FFmpeg gagal dimuatkan dari CDN.<br/>2. Klip video yang dipilih terlalu besar." }}></td><td className="px-4 py-3 sm:px-6 sm:py-4 align-top" dangerouslySetInnerHTML={{ __html: "1. Pastikan sambungan internet stabil.<br/>2. Cuba lumpuhkan ad-blocker buat sementara waktu.<br/>3. Cuba gabungkan klip yang lebih pendek (kurang dari 1 minit setiap satu)." }}></td></tr>
                            </tbody>
                        </table>
                    </div>
                </Section>
            </div>
        </div>
    );
};

// FIX: Changed to a named export to resolve the "no default export" error.
export { GetStartedView };
