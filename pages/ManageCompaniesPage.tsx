import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useApp } from '../hooks/useApp';
import { User, Submission, Question, Category } from '../types';
import ConfirmationModal from '../components/ConfirmationModal';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Icons
const DeleteIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
    </svg>
);
const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);
const ChartBarIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
);
const CheckCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
);
const XCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
    </svg>
);
const MagnifyingGlassIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
);


const maturityLevels = [
    { level: 'Crítico', range: '0 - 30%', icon: '🔴', color: 'bg-red-900/50', chartColor: '#EF4444' },
    { level: 'Precário', range: '31 - 50%', icon: '🟠', color: 'bg-orange-900/50', chartColor: '#F97316' },
    { level: 'Mediano', range: '51 - 70%', icon: '🟡', color: 'bg-yellow-900/50', chartColor: '#EAB308' },
    { level: 'Avançado', range: '71 - 100%', icon: '🟢', color: 'bg-green-900/50', chartColor: '#22C55E' },
];

const getMaturityLevel = (score: number, maxScore: number) => {
    if (maxScore === 0) return maturityLevels[0];
    const percentage = (score / maxScore) * 100;
    if (percentage <= 30) return maturityLevels[0];
    if (percentage <= 50) return maturityLevels[1];
    if (percentage <= 70) return maturityLevels[2];
    return maturityLevels[3];
};

const parseDetailedAnswers = (data: any, allQuestionsForCategory: Question[]): { questionText: string; selectedAnswerText: string }[] => {
    if (!data) return [];

    if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object' && 'questionText' in data[0]) {
        return data;
    }

    if (typeof data === 'string') {
        try {
            const parsed = JSON.parse(data);
            if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object' && 'questionText' in parsed[0]) {
                return parsed;
            }
        } catch (e) {
            // Not JSON, proceed to custom parsing
        }

        const results: { questionText: string; selectedAnswerText: string }[] = [];
        const segments = data.split(/(?=\s*-\s*\d+\.\s*Pergunta:)/);

        if (segments.length > 1) {
            if (allQuestionsForCategory.length > 0) {
                const firstAnswerText = segments[0].replace(/^[a-zA-Z]\)\s*/, '').replace(/[✅♦]\s*/, '').trim();
                results.push({
                    questionText: allQuestionsForCategory[0].text,
                    selectedAnswerText: firstAnswerText,
                });
            }

            for (let i = 1; i < segments.length; i++) {
                const segment = segments[i];
                const questionMatch = segment.match(/Pergunta:\s*([\s\S]*?)\s*Resposta:/i);
                const answerMatch = segment.match(/Resposta:\s*([\s\S]*)/i);

                if (questionMatch && answerMatch) {
                    const question = questionMatch[1].trim();
                    const answer = answerMatch[1].replace(/^[a-zA-Z]\)\s*/, '').replace(/[✅♦]\s*/, '').trim();
                    results.push({ questionText: question, selectedAnswerText: answer });
                }
            }
            return results;
        }
        
        const questionParts = data.split(/Pergunta:/).filter(p => p.trim());
        if (questionParts.length > 0) {
            for (const part of questionParts) {
                const qaSplit = part.split('Resposta:');
                if (qaSplit.length === 2) {
                    const question = qaSplit[0].trim();
                    const answer = qaSplit[1].replace(/[✅♦]\s*/, '').trim();
                    results.push({ questionText: question, selectedAnswerText: answer });
                }
            }
            if (results.length > 0) return results;
        }
    }

    return [];
};

const ApiMessageModal: React.FC<{
    message: { type: 'success' | 'error', text: string } | null;
    onClose: () => void;
}> = ({ message, onClose }) => {
    if (!message) return null;

    const isSuccess = message.type === 'success';
    const iconColor = isSuccess ? 'text-green-400' : 'text-red-400';
    const buttonClass = isSuccess ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700';
    const Icon = isSuccess ? CheckCircleIcon : XCircleIcon;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-[70] flex justify-center items-center p-4">
            <div className="bg-dark-card rounded-xl shadow-2xl p-6 w-full max-w-md text-center border border-dark-border">
                <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full ${isSuccess ? 'bg-green-100' : 'bg-red-100'}`}>
                    <Icon className={`h-8 w-8 ${iconColor}`} />
                </div>
                <h3 className="text-xl font-bold mt-4 mb-2 text-dark-text">{isSuccess ? 'Sucesso!' : 'Erro!'}</h3>
                <div className="mb-6 text-gray-300">
                    <p>{message.text}</p>
                </div>
                <div className="flex justify-center">
                    <button
                        onClick={onClose}
                        className={`px-6 py-2 rounded-md text-base font-medium text-white transition-colors ${buttonClass}`}
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
};

const ManageCompaniesPage: React.FC = () => {
    const { 
        allRegisteredCompanies, 
        fetchAllRegisteredCompanies,
        deleteCompany,
        submissions,
        employeeSubmissions,
        allEmployees,
        categories,
        questions,
        fetchSubmissions,
        fetchEmployeeScoresForAdmin,
        fetchAllEmployees
    } = useApp();

    const [view, setView] = useState<'list' | 'comparison'>('list');
    const [searchTerm, setSearchTerm] = useState('');
    const [companyToDelete, setCompanyToDelete] = useState<User | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [apiMessage, setApiMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Comparison state
    const [comparisonType, setComparisonType] = useState<'companies' | 'employees'>('companies');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [comparisonSearchTerm, setComparisonSearchTerm] = useState('');
    const [employeeCompanyFilter, setEmployeeCompanyFilter] = useState<string>('all');
    const [pdfFlowStep, setPdfFlowStep] = useState<'idle' | 'confirm' | 'loading' | 'success'>('idle');
    const comparisonReportRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchAllRegisteredCompanies();
        fetchSubmissions();
        fetchEmployeeScoresForAdmin();
        fetchAllEmployees();
    }, [fetchAllRegisteredCompanies, fetchSubmissions, fetchEmployeeScoresForAdmin, fetchAllEmployees]);
    
    useEffect(() => {
        if (pdfFlowStep === 'success') {
            setApiMessage({ type: 'success', text: 'PDF gerado com sucesso! O download começará em breve.' });
            setPdfFlowStep('idle');
        }
    }, [pdfFlowStep]);


    const filteredCompanies = useMemo(() => {
        return allRegisteredCompanies.filter(company => 
            company.companyName.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [allRegisteredCompanies, searchTerm]);

    const handleConfirmDelete = async () => {
        if (!companyToDelete) return;
        
        setIsSubmitting(true);
        const result = await deleteCompany(companyToDelete);
        setApiMessage({ type: result.success ? 'success' : 'error', text: result.message });
        setIsSubmitting(false);
        setCompanyToDelete(null);
    };

    const handleSelectionChange = (id: string) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };
    
    const comparisonItems = useMemo(() => {
        const lowerSearch = comparisonSearchTerm.toLowerCase();
        if (comparisonType === 'companies') {
            return allRegisteredCompanies.filter(c => c.companyName.toLowerCase().includes(lowerSearch));
        }
        let employees = allEmployees;
        if (employeeCompanyFilter !== 'all') {
            employees = employees.filter(e => e.companyName === employeeCompanyFilter);
        }
        return employees.filter(e => e.name.toLowerCase().includes(lowerSearch) || e.companyName.toLowerCase().includes(lowerSearch));
    }, [comparisonSearchTerm, allRegisteredCompanies, allEmployees, comparisonType, employeeCompanyFilter]);


    const comparisonData = useMemo(() => {
        if (selectedIds.size < 1) return null;
  
        const data: {
            overall: { name: string; score: number; photoUrl?: string }[];
            categories: Record<string, { name: string; score: number; photoUrl?: string }[]>;
            answersByCategory: Record<string, {
                question: string;
                answers: {
                    name: string;
                    answer: string;
                }[];
            }[]>;
        } = {
            overall: [],
            categories: {},
            answersByCategory: {},
        };
  
        const sourceSubmissions = comparisonType === 'companies' ? submissions : employeeSubmissions;
        const relevantCategories = categories.filter(c => sourceSubmissions.some(s => s.categoryId === c.id));
        
        relevantCategories.forEach(cat => { data.categories[cat.name] = []; });
  
        // Process Scores
        selectedIds.forEach(id => {
            let name: string;
            let photoUrl: string | undefined;
            let userSubs: Submission[];
            
            if (comparisonType === 'companies') {
                const company = allRegisteredCompanies.find(c => c.id === id);
                if (!company) return;
                name = company.companyName;
                photoUrl = company.photoUrl;
                userSubs = sourceSubmissions.filter(s => s.companyName === name);
            } else {
                const employee = allEmployees.find(e => e.id === id);
                if (!employee) return;
                name = `${employee.name} (${employee.companyName})`;
                photoUrl = employee.photoUrl;
                userSubs = sourceSubmissions.filter(s => s.userName === employee.name && s.companyName === employee.companyName);
            }
  
            if (userSubs.length === 0) {
                 data.overall.push({ name, score: 0, photoUrl });
                 relevantCategories.forEach(cat => { data.categories[cat.name].push({ name, score: 0, photoUrl }); });
                return;
            };
  
            const totalScore = userSubs.reduce((sum, s) => sum + s.totalScore, 0);
            const maxScore = userSubs.reduce((sum, s) => sum + s.maxScore, 0);
            const overallPercentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
            
            data.overall.push({ name, score: overallPercentage, photoUrl });
  
            relevantCategories.forEach(cat => {
                const catSub = userSubs.find(s => s.categoryId === cat.id);
                const catScore = (catSub && catSub.maxScore > 0) ? (catSub.totalScore / catSub.maxScore) * 100 : 0;
                data.categories[cat.name].push({ name, score: catScore, photoUrl });
            });
        });

        // Process Answers
        const answersByCategory: Record<string, { question: string; answers: { name: string; answer: string }[] }[]> = {};
        const allQuestions = relevantCategories.flatMap(cat => questions.filter(q => q.categoryId === cat.id && sourceSubmissions.some(s => s.categoryId === cat.id)));
        const uniqueQuestions = Array.from(new Map(allQuestions.map(q => [q.id, q])).values());

        uniqueQuestions.forEach(q => {
            const category = categories.find(c => c.id === q.categoryId);
            if (!category) return;
            
            if (!answersByCategory[category.name]) {
                answersByCategory[category.name] = [];
            }

            const questionEntry: { question: string; answers: { name: string; answer: string }[] } = {
                question: q.text,
                answers: []
            };

            selectedIds.forEach(id => {
                let name: string;
                let userSubs: Submission[];
                
                if (comparisonType === 'companies') {
                    const company = allRegisteredCompanies.find(c => c.id === id);
                    if (!company) return;
                    name = company.companyName;
                    userSubs = sourceSubmissions.filter(s => s.companyName === name);
                } else {
                    const employee = allEmployees.find(e => e.id === id);
                    if (!employee) return;
                    name = `${employee.name} (${employee.companyName})`;
                    userSubs = sourceSubmissions.filter(s => s.userName === employee.name && s.companyName === employee.companyName);
                }

                const catSub = userSubs.find(s => s.categoryId === q.categoryId);
                let answerText = 'Não respondeu';

                if (catSub && catSub.detailedAnswers) {
                    const allQuestionsForCategory = questions.filter(ques => ques.categoryId === catSub.categoryId);
                    const parsedAnswers = parseDetailedAnswers(catSub.detailedAnswers, allQuestionsForCategory);
                    const foundAnswer = parsedAnswers.find(pa => pa.questionText === q.text);
                    if (foundAnswer) {
                        answerText = foundAnswer.selectedAnswerText;
                    }
                }
                questionEntry.answers.push({ name, answer: answerText });
            });

            answersByCategory[category.name].push(questionEntry);
        });
        
        data.answersByCategory = answersByCategory;
  
        data.overall.sort((a, b) => a.name.localeCompare(b.name));
        Object.values(data.categories).forEach(arr => arr.sort((a, b) => a.name.localeCompare(b.name)));
  
        return data;
    }, [selectedIds, comparisonType, submissions, employeeSubmissions, categories, allRegisteredCompanies, allEmployees, questions]);

    const handleDownloadPDF = async () => {
        const reportElement = comparisonReportRef.current;
        if (!reportElement) {
            setApiMessage({ type: 'error', text: 'Elemento do relatório não encontrado.' });
            return;
        }
    
        setPdfFlowStep('loading');
    
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.top = '0';
        container.style.width = '1400px'; 
        container.style.backgroundColor = '#111827';
        container.style.color = '#F3F4F6';
        container.style.padding = '24px';
        container.style.fontFamily = 'Inter, sans-serif';
    
        const clone = reportElement.cloneNode(true) as HTMLElement;
        clone.classList.add('dark');
        container.appendChild(clone);
        document.body.appendChild(container);
    
        try {
            await new Promise(resolve => setTimeout(resolve, 200));
    
            const canvas = await html2canvas(clone, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#111827',
            });
    
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'p',
                unit: 'px',
                format: 'a4',
            });
    
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            const ratio = canvasWidth / canvasHeight;
    
            const imgHeight = pdfWidth / ratio;
            let heightLeft = imgHeight;
            let position = 0;
    
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
            heightLeft -= pdfHeight;
    
            while (heightLeft > 0) {
                position -= pdfHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
                heightLeft -= pdfHeight;
            }
    
            pdf.save('relatorio-comparativo.pdf');
            setPdfFlowStep('success');
        } catch (error) {
            console.error("Erro ao gerar PDF:", error);
            setApiMessage({ type: 'error', text: 'Ocorreu um erro ao gerar o PDF. Tente novamente.' });
            setPdfFlowStep('idle');
        } finally {
            if (container.parentNode) {
                document.body.removeChild(container);
            }
        }
    };


    const renderListView = () => (
        <>
            <div className="flex flex-wrap gap-4 justify-between items-center mb-6 pb-6 border-b border-dark-border">
                <div>
                    <h2 className="text-xl font-semibold text-dark-text">Lista de Empresas ({filteredCompanies.length})</h2>
                    <p className="text-gray-400 text-sm mt-1">Veja e remova empresas cadastradas no sistema.</p>
                </div>
                 <button
                    onClick={() => { setView('comparison'); setSelectedIds(new Set()); setComparisonSearchTerm(''); }}
                    className="px-5 py-2.5 rounded-lg font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 transition-all flex items-center gap-2"
                >
                    <ChartBarIcon className="h-5 w-5" />
                    Comparar Empresas
                </button>
            </div>
            <div className="relative mb-6">
                <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                    type="text"
                    placeholder="Buscar empresa pelo nome..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full max-w-lg p-3 pl-12 border border-dark-border rounded-lg bg-dark-background focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                />
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCompanies.map(company => (
                    <div key={company.id} className="bg-dark-background p-4 rounded-lg border border-dark-border flex flex-col items-start gap-3">
                        <div className="flex items-center gap-4 w-full">
                            <img
                                src={company.photoUrl || 'https://edrrnawrhfhoynpiwqsc.supabase.co/storage/v1/object/public/imagenscientes/Imagens%20Score%20Inteligente/icon%20user.png'}
                                alt={`Logo ${company.companyName}`}
                                className="w-16 h-16 rounded-full object-contain bg-dark-card p-1 border-2 border-dark-border flex-shrink-0"
                            />
                            <div className="min-w-0 flex-grow">
                                <p className="font-bold text-lg text-dark-text truncate" title={company.companyName}>{company.companyName}</p>
                                <p className="text-sm text-gray-400 truncate" title={company.email}>{company.email}</p>
                            </div>
                        </div>
                         <div className="w-full mt-auto pt-3 border-t border-dark-border/50 flex justify-end">
                            <button
                                onClick={() => setCompanyToDelete(company)}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-400 bg-red-900/50 rounded-lg hover:bg-red-900/80 hover:text-red-300 transition-colors"
                            >
                                <DeleteIcon />
                                Excluir
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </>
    );

    const renderComparisonView = () => (
        <>
            <div className="flex flex-wrap gap-4 justify-between items-center mb-6 pb-6 border-b border-dark-border">
                <div>
                    <button onClick={() => setView('list')} className="font-medium text-sm text-cyan-400 hover:underline mb-2">&larr; Voltar para Lista</button>
                    <h2 className="text-xl font-semibold text-dark-text">Área de Comparação</h2>
                </div>
                <button
                    onClick={() => {
                        if (selectedIds.size === 0) {
                            setApiMessage({ type: 'error', text: 'Selecione pelo menos um item para gerar o relatório.' });
                            return;
                        }
                        setPdfFlowStep('confirm');
                    }}
                    disabled={pdfFlowStep === 'loading'}
                    className="px-5 py-2.5 rounded-lg font-semibold text-white bg-green-600 hover:bg-green-700 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <DownloadIcon />
                    {pdfFlowStep === 'loading' ? 'Gerando PDF...' : 'Download PDF'}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Tipo de Comparação:</label>
                    <div className="flex items-center bg-dark-background p-1 rounded-full border border-dark-border">
                         <button onClick={() => { setComparisonType('companies'); setSelectedIds(new Set()); }} className={`w-1/2 py-2 text-sm font-semibold rounded-full transition-all ${comparisonType === 'companies' ? 'bg-cyan-500 text-white' : 'text-gray-400'}`}>Empresas</button>
                         <button onClick={() => { setComparisonType('employees'); setSelectedIds(new Set()); }} className={`w-1/2 py-2 text-sm font-semibold rounded-full transition-all ${comparisonType === 'employees' ? 'bg-cyan-500 text-white' : 'text-gray-400'}`}>Funcionários</button>
                    </div>
                </div>
                {comparisonType === 'employees' && (
                    <div>
                        <label htmlFor="employee-company-filter" className="block text-sm font-medium text-gray-300 mb-2">Filtrar por Empresa:</label>
                        <select id="employee-company-filter" value={employeeCompanyFilter} onChange={e => { setEmployeeCompanyFilter(e.target.value); setSelectedIds(new Set()); }} className="w-full p-2.5 border border-dark-border rounded-lg bg-dark-background focus:outline-none focus:ring-2 focus:ring-blue-500">
                          <option value="all">Todas as Empresas</option>
                          {allRegisteredCompanies.map(c => <option key={c.id} value={c.companyName}>{c.companyName}</option>)}
                        </select>
                    </div>
                )}
            </div>
            
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">Selecione para Comparar:</label>
                <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input type="text" placeholder="Buscar..." value={comparisonSearchTerm} onChange={e => setComparisonSearchTerm(e.target.value)} className="w-full p-2.5 pl-10 border border-dark-border rounded-lg bg-dark-background focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"/>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-80 overflow-y-auto pr-2">
                    {comparisonItems.map(item => {
                        const isEmployee = comparisonType === 'employees';
                        const id = item.id;
                        const name = isEmployee ? item.name : item.companyName;
                        const photoUrl = item.photoUrl;
                        const subtitle = isEmployee ? item.companyName : null;
                        const isSelected = selectedIds.has(id);
                        return (
                            <div key={id} onClick={() => handleSelectionChange(id)} className={`relative bg-dark-background p-3 rounded-lg border-2 transition-all cursor-pointer flex items-center gap-3 text-left hover:-translate-y-1 group ${isSelected ? 'border-cyan-400' : 'border-dark-border'}`}>
                                <img src={photoUrl || 'https://edrrnawrhfhoynpiwqsc.supabase.co/storage/v1/object/public/imagenscientes/Imagens%20Score%20Inteligente/icon%20user.png'} alt={name} className={`w-12 h-12 rounded-full border-2 shrink-0 ${isEmployee ? 'object-cover' : 'object-contain bg-dark-card p-1'} ${isSelected ? 'border-cyan-400' : 'border-gray-700'}`}/>
                                <div className="min-w-0">
                                    <p className="font-semibold text-sm text-gray-200 truncate">{name}</p>
                                    {subtitle && <p className="text-xs text-gray-400 truncate">{subtitle}</p>}
                                </div>
                                {isSelected && <div className="absolute top-1 right-1 bg-cyan-500 text-white rounded-full p-0.5"><CheckCircleIcon className="h-4 w-4" /></div>}
                            </div>
                        );
                    })}
                </div>
            </div>

            {comparisonData ? (
                 <div ref={comparisonReportRef} className="bg-dark-card p-6 rounded-xl mt-4">
                    <h3 className="text-2xl font-semibold text-dark-text mb-6 text-center">Relatório Comparativo</h3>
                    <div className="space-y-12">
                        <div>
                            <h4 className="text-xl font-bold text-cyan-400 mb-6 text-center">Score Geral</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {comparisonData.overall.map(item => {
                                    const maturity = getMaturityLevel(item.score, 100);
                                    const chartData = [{ name: 'Score', value: item.score }, { name: 'Remaining', value: Math.max(0, 100 - item.score) }];
                                    return (
                                        <div key={item.name} className="bg-dark-background p-4 rounded-xl shadow-lg border border-dark-border flex flex-col items-center">
                                            <div className="flex items-center justify-center gap-3 mb-2 h-12">
                                                {item.photoUrl && <img src={item.photoUrl} alt={`Logo de ${item.name}`} className={`h-10 w-10 shrink-0 ${comparisonType === 'companies' ? 'object-contain' : 'rounded-full object-cover'}`}/>}
                                                <h5 className="text-base font-semibold text-center text-cyan-400" title={item.name}>{item.name}</h5>
                                            </div>
                                            <div style={{ width: '100%', height: 180, position: 'relative' }}>
                                                <ResponsiveContainer>
                                                    <PieChart>
                                                        <Pie data={chartData} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={70} startAngle={90} endAngle={450} cornerRadius={5}>
                                                            {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={[maturity.chartColor, '#374151'][index]} stroke="none" />)}
                                                        </Pie>
                                                    </PieChart>
                                                </ResponsiveContainer>
                                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                                    <span className="text-2xl sm:text-3xl font-bold">{item.score.toFixed(0)}%</span>
                                                </div>
                                            </div>
                                            <div className={`mt-2 text-center font-semibold p-2 rounded-lg w-full ${maturity.color}`}>{maturity.icon} {maturity.level}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {Object.entries(comparisonData.categories).map(([categoryName, data]) => (
                            <div key={categoryName}>
                                <h4 className="text-xl font-bold text-cyan-400 mb-6 text-center">{categoryName}</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {data.map(item => {
                                        const maturity = getMaturityLevel(item.score, 100);
                                        const chartData = [{ name: 'Score', value: item.score }, { name: 'Remaining', value: Math.max(0, 100 - item.score) }];
                                        return (
                                            <div key={item.name} className="bg-dark-background p-4 rounded-xl shadow-lg border border-dark-border flex flex-col items-center">
                                                <h5 className="text-base font-semibold text-center text-cyan-400 mb-2 h-12 flex items-center justify-center" title={item.name}>{item.name}</h5>
                                                <div style={{ width: '100%', height: 180, position: 'relative' }}>
                                                    <ResponsiveContainer><PieChart><Pie data={chartData} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={70} startAngle={90} endAngle={450} cornerRadius={5}>{chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={[maturity.chartColor, '#374151'][index]} stroke="none" />)}</Pie></PieChart></ResponsiveContainer>
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"><span className="text-2xl sm:text-3xl font-bold">{item.score.toFixed(0)}%</span></div>
                                                </div>
                                                <div className={`mt-2 text-center font-semibold p-2 rounded-lg w-full ${maturity.color}`}>{maturity.icon} {maturity.level}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-12 pt-8 border-t border-dark-border">
                        <h3 className="text-2xl font-semibold text-dark-text mb-6 text-center">Comparativo de Respostas</h3>
                        <div className="space-y-8">
                        {Object.entries(comparisonData.answersByCategory).map(([categoryName, questionsAndAnswers]) => (
                            <div key={categoryName} className="bg-dark-background p-6 rounded-xl border border-dark-border">
                                <h4 className="text-xl font-bold text-cyan-400 mb-4">{categoryName}</h4>
                                <div className="space-y-6">
                                {questionsAndAnswers.map((qa, index) => (
                                    <div key={index} className="border-t border-dark-border/50 pt-4 first:border-t-0 first:pt-0">
                                    <p className="font-semibold text-gray-300 mb-3">({index + 1}) {qa.question}</p>
                                    <ul className="space-y-2 pl-4">
                                        {qa.answers.map((ans, ansIndex) => (
                                        <li key={ansIndex} className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-x-4 gap-y-1 text-sm">
                                            <span className="font-medium text-gray-400 truncate" title={ans.name}>{ans.name}:</span>
                                            <span className="text-gray-200">{ans.answer}</span>
                                        </li>
                                        ))}
                                    </ul>
                                    </div>
                                ))}
                                </div>
                            </div>
                        ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center py-12 px-6 h-full flex flex-col justify-center items-center bg-dark-background rounded-lg border-2 border-dashed border-dark-border mt-6">
                     <ChartBarIcon className="h-16 w-16 text-gray-500 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-300">Selecione para Comparar</h3>
                    <p className="text-gray-400 mt-2">Escolha um ou mais itens para visualizar os gráficos e as respostas.</p>
                </div>
            )}
        </>
    );

    return (
        <div className="container mx-auto">
            {isSubmitting && (
                <div className="fixed inset-0 bg-dark-background bg-opacity-90 z-[80] flex flex-col justify-center items-center p-4">
                    <div className="loader-container"><div className="loader triangle"><svg viewBox="0 0 86 80"><polygon points="43 8 79 72 7 72"></polygon></svg></div><div className="loadingtext"><p>Processando</p></div></div>
                </div>
            )}
            {pdfFlowStep === 'loading' && (
                <div className="fixed inset-0 bg-dark-background bg-opacity-90 z-[80] flex flex-col justify-center items-center p-4">
                    <div className="loader-container">
                        <div className="loader triangle"><svg viewBox="0 0 86 80"><polygon points="43 8 79 72 7 72"></polygon></svg></div>
                        <div className="loadingtext"><p>Gerando PDF</p></div>
                    </div>
                </div>
            )}
            <ApiMessageModal message={apiMessage} onClose={() => setApiMessage(null)} />
            <ConfirmationModal
                isOpen={pdfFlowStep === 'confirm'}
                onClose={() => setPdfFlowStep('idle')}
                onConfirm={() => {
                    setPdfFlowStep('idle');
                    handleDownloadPDF();
                }}
                title="Confirmar Download"
                confirmButtonText="Gerar PDF"
                confirmButtonClass="bg-green-600 hover:bg-green-700"
            >
                <p>Deseja gerar o PDF do relatório comparativo atual?</p>
            </ConfirmationModal>
            <ConfirmationModal
                isOpen={!!companyToDelete}
                onClose={() => setCompanyToDelete(null)}
                onConfirm={handleConfirmDelete}
                title="Confirmar Exclusão de Empresa"
                confirmButtonText="Excluir Permanentemente"
                confirmButtonClass="bg-red-600 hover:bg-red-700"
            >
                <p>Tem certeza que deseja excluir a empresa <strong className="text-cyan-400">{companyToDelete?.companyName}</strong>?</p>
                <p className="mt-2 text-sm text-yellow-400">Esta ação é irreversível e removerá todos os dados associados a esta empresa, incluindo funcionários e pontuações.</p>
            </ConfirmationModal>

            <h1 className="text-3xl font-bold mb-8">Gerenciar Empresas</h1>

            <div className="bg-dark-card p-4 sm:p-6 rounded-xl shadow-lg border border-dark-border">
                {view === 'list' ? renderListView() : renderComparisonView()}
            </div>
        </div>
    );
};

export default ManageCompaniesPage;