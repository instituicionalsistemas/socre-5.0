import React, { useState } from 'react';
import { useApp } from '../hooks/useApp';
import { UserRole } from '../types';

const MenuIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" />
    </svg>
);

const XIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);


const Header: React.FC = () => {
    const { currentUser, logout, selectedCompany, selectCompany } = useApp();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    
    const handleNav = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
        e.preventDefault();
        window.location.hash = path;
        setIsMenuOpen(false); // Close menu on navigation
        if (currentUser?.role === UserRole.GROUP && path !== '#dashboard') {
            selectCompany(null); // Clear selected company when navigating away from dashboard
        }
    };

    const handleBackToGroupDashboard = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        selectCompany(null);
        window.location.hash = '#group-dashboard';
        setIsMenuOpen(false);
    };

    const navLinks = (
        <>
            {currentUser?.role !== UserRole.GROUP && (
                <a href="#dashboard" onClick={(e) => handleNav(e, '#dashboard')} className="block md:inline-block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-dark-border transition-colors">Painel</a>
            )}
            
            {currentUser?.role === UserRole.ADMIN && (
                <a href="#manage-companies" onClick={(e) => handleNav(e, '#manage-companies')} className="block md:inline-block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-dark-border transition-colors">Gerenciar empresas</a>
            )}

            {currentUser?.role !== UserRole.GROUP && (
                <a href="#questionnaire" onClick={(e) => handleNav(e, '#questionnaire')} className="block md:inline-block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-dark-border transition-colors">Questionário</a>
            )}

            {/* NeuroMapa link with role-based destination, placed next to "Questionário" */}
            {currentUser?.role !== UserRole.GROUP && (
                <a 
                    href={currentUser?.role === UserRole.ADMIN ? '#neuromapa' : '#neuromapa-questionnaire'} 
                    onClick={(e) => handleNav(e, currentUser?.role === UserRole.ADMIN ? '#neuromapa' : '#neuromapa-questionnaire')} 
                    className="block md:inline-block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-dark-border transition-colors"
                >
                    NeuroMapa
                </a>
            )}

            {currentUser?.role === UserRole.ADMIN && (
                <>
                    <a href="#prova-oral" onClick={(e) => handleNav(e, '#prova-oral')} className="block md:inline-block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-dark-border transition-colors">Prova Oral</a>
                    <a href="#admin" onClick={(e) => handleNav(e, '#admin')} className="block md:inline-block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-dark-border transition-colors">Admin</a>
                    <a href="#logs" onClick={(e) => handleNav(e, '#logs')} className="block md:inline-block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-dark-border transition-colors">Logs</a>
                </>
            )}
            <a href="#profile" onClick={(e) => handleNav(e, '#profile')} className="flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-dark-border transition-colors">
                {currentUser?.role === UserRole.EMPLOYEE && currentUser.photoUrl ? (
                    <img src={currentUser.photoUrl} alt="Perfil" className="w-6 h-6 rounded-full object-cover" />
                ) : null}
                <span>Meu Perfil</span>
            </a>
            <button
                onClick={() => {
                    logout();
                    setIsMenuOpen(false);
                }}
                className="w-full md:w-auto mt-4 md:mt-0 px-3 py-2 rounded-md text-base font-medium bg-red-600 text-white hover:bg-red-700 transition-colors text-left md:text-center"
            >
                Sair
            </button>
        </>
    );


    return (
        <header className="bg-dark-background sticky top-0 z-40 w-full border-b border-dark-border">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center gap-4">
                        <a href="#login" onClick={(e) => handleNav(e, '#login')} className="flex items-center gap-2 sm:gap-4 text-xl font-bold">
                             <img 
                                src="https://aisfizoyfpcisykarrnt.supabase.co/storage/v1/object/public/imagens/LOGO%20TRIAD3%20.png" 
                                alt="Logo Triad3" 
                                className="app-logo"
                            />
                             <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 text-base sm:text-xl">
                                Score Inteligente
                            </span>
                        </a>
                        {currentUser?.role === UserRole.GROUP && selectedCompany && (
                            <a href="#group-dashboard" onClick={handleBackToGroupDashboard} className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold text-gray-900 bg-cyan-400 hover:bg-cyan-300 transition-colors">
                                &larr; Voltar ao Painel do Grupo
                            </a>
                        )}
                    </div>
                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center space-x-2 lg:space-x-4">
                        {currentUser && navLinks}
                    </div>
                     {/* Mobile Menu Button */}
                    <div className="md:hidden flex items-center">
                         {currentUser && (
                             <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-dark-border focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white" aria-expanded={isMenuOpen}>
                                <span className="sr-only">Abrir menu</span>
                                {isMenuOpen ? <XIcon /> : <MenuIcon />}
                            </button>
                         )}
                    </div>
                </div>
            </div>
            {/* Mobile Menu */}
             {isMenuOpen && currentUser && (
                <div className="md:hidden" id="mobile-menu">
                    <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                        {currentUser?.role === UserRole.GROUP && selectedCompany && (
                            <a href="#group-dashboard" onClick={handleBackToGroupDashboard} className="flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium text-gray-900 bg-cyan-400 hover:bg-cyan-300 transition-colors">
                                &larr; Voltar ao Painel do Grupo
                            </a>
                        )}
                        {navLinks}
                    </div>
                </div>
            )}
        </header>
    );
};

export default Header;