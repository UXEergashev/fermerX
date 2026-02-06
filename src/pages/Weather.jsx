import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import {
    CloudSun,
    Sun,
    Cloud,
    CloudRain,
    Wind,
    Droplets,
    Lightbulb,
    MapPin,
    RefreshCw
} from 'lucide-react';

const Weather = () => {
    const { t } = useLanguage();
    const [weatherData, setWeatherData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [location, setLocation] = useState('Toshkent');

    useEffect(() => {
        loadWeather();
    }, []);

    const loadWeather = async () => {
        setLoading(true);
        setError(null);

        try {
            // Get user's location
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    async (position) => {
                        await fetchWeather(position.coords.latitude, position.coords.longitude);
                    },
                    async () => {
                        // Fallback to Tashkent coordinates if location denied
                        await fetchWeather(41.2995, 69.2401);
                    }
                );
            } else {
                // Fallback if geolocation not supported
                await fetchWeather(41.2995, 69.2401);
            }
        } catch (err) {
            setError('Ob-havo ma\'lumotini yuklab bo\'lmadi');
            setLoading(false);
        }
    };

    const fetchWeather = async (lat, lon) => {
        try {
            // Note: This is a demo - in production, use a real weather API like OpenWeatherMap
            // For now, generate mock data
            const mockData = generateMockWeather();
            setWeatherData(mockData);
            setLoading(false);
        } catch (err) {
            setError('Ob-havo ma\'lumotini yuklab bo\'lmadi');
            setLoading(false);
        }
    };

    const generateMockWeather = () => {
        const days = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
        const today = new Date();

        return Array.from({ length: 7 }, (_, i) => {
            const date = new Date(today);
            date.setDate(date.getDate() + i);

            const tempMin = Math.floor(Math.random() * 10) + 15;
            const tempMax = tempMin + Math.floor(Math.random() * 10) + 5;

            const conditions = [
                { text: 'Quyoshli', icon: 'Sun' },
                { text: 'Bulutli', icon: 'Cloud' },
                { text: 'Yomg\'irli', icon: 'CloudRain' },
                { text: 'Qisman bulutli', icon: 'CloudSun' }
            ];
            const conditionObj = conditions[Math.floor(Math.random() * conditions.length)];

            return {
                day: i === 0 ? 'Bugun' : i === 1 ? 'Ertaga' : days[date.getDay()],
                date: date.toLocaleDateString('uz-UZ'),
                tempMin,
                tempMax,
                condition: conditionObj.text,
                conditionIcon: conditionObj.icon,
                rain: Math.floor(Math.random() * 100),
                wind: Math.floor(Math.random() * 20) + 5
            };
        });
    };

    if (loading) {
        return (
            <div className="spinner-container">
                <div className="spinner"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div>
                <h1>{t('weather.title')}</h1>
                <div className="alert alert-danger">{error}</div>
                <button onClick={loadWeather} className="btn btn-primary mt-md">
                    {t('common.confirm')}
                </button>
            </div>
        );
    }

    return (
        <div>
            <div style={styles.header}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div className="icon-container icon-primary">
                        <CloudSun size={24} />
                    </div>
                    <div>
                        <h1 style={{ margin: 0 }}>{t('weather.title')}</h1>
                        <p className="text-muted" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem' }}>
                            <MapPin size={14} /> {location}
                        </p>
                    </div>
                </div>
                <button onClick={loadWeather} className="btn btn-outline btn-sm">
                    <RefreshCw size={14} /> {t('common.confirm')}
                </button>
            </div>

            <div className="grid">
                {weatherData && weatherData.map((day, index) => (
                    <WeatherCard key={index} data={day} isToday={index === 0} />
                ))}
            </div>

            <div className="card mt-lg">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    <div className="icon-container icon-warning" style={{ padding: '8px' }}>
                        <Lightbulb size={20} />
                    </div>
                    <h3 className="card-title" style={{ margin: 0 }}>Maslahatlar</h3>
                </div>
                <ul style={styles.tips}>
                    <li>Yomg'irli kunlarda sug'orishni to'xtatish tavsiya etiladi</li>
                    <li>Yuqori haroratda ekinlarni qo'shimcha sug'orish kerak bo'lishi mumkin</li>
                    <li>Kuchli shamol paytida o'g'itlashdan saqlanish kerak</li>
                </ul>
            </div>
        </div>
    );
};

const WeatherCard = ({ data, isToday }) => {
    return (
        <div className="card" style={isToday ? styles.todayCard : {}}>
            <div style={styles.dayHeader}>
                <span style={styles.dayName}>{data.day}</span>
                <span className="text-muted text-small">{data.date}</span>
            </div>

            <div style={styles.condition}>
                <div className="icon-container" style={{
                    padding: '1rem',
                    borderRadius: '50%',
                    background: 'rgba(245, 158, 11, 0.1)',
                    color: '#f59e0b',
                    marginBottom: '0.5rem'
                }}>
                    {data.conditionIcon === 'Sun' && <Sun size={32} />}
                    {data.conditionIcon === 'Cloud' && <Cloud size={32} />}
                    {data.conditionIcon === 'CloudRain' && <CloudRain size={32} />}
                    {data.conditionIcon === 'CloudSun' && <CloudSun size={32} />}
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937' }}>{data.condition}</div>
            </div>

            <div style={styles.temp}>
                <span style={styles.tempMax}>{data.tempMax}°</span>
                <span style={styles.tempMin}>{data.tempMin}°</span>
            </div>

            <div style={styles.details}>
                <div style={styles.detail}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Droplets size={14} /> {t('weather.rain') || 'Yomg\'ir'}
                    </span>
                    <span style={{ fontWeight: '600' }}>{data.rain}%</span>
                </div>
                <div style={styles.detail}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Wind size={14} /> {t('weather.wind') || 'Shamol'}
                    </span>
                    <span style={{ fontWeight: '600' }}>{data.wind} km/s</span>
                </div>
            </div>
        </div>
    );
};

const styles = {
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '1.5rem'
    },
    todayCard: {
        borderLeft: '4px solid var(--primary)',
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, var(--bg-card) 100%)'
    },
    dayHeader: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
        marginBottom: '1rem'
    },
    dayName: {
        fontSize: '1.125rem',
        fontWeight: '600',
        color: 'var(--text-main)'
    },
    condition: {
        fontSize: '1.5rem',
        marginBottom: '1rem',
        textAlign: 'center'
    },
    temp: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        marginBottom: '1rem'
    },
    tempMax: {
        fontSize: '2.5rem',
        fontWeight: '700',
        color: 'var(--text-main)'
    },
    tempMin: {
        fontSize: '1.5rem',
        color: 'var(--text-muted)'
    },
    details: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        paddingTop: '1rem',
        borderTop: '1px solid var(--border)'
    },
    detail: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '0.875rem',
        color: 'var(--text-muted)'
    },
    tips: {
        paddingLeft: '1.5rem',
        margin: '0.5rem 0',
        color: 'var(--text-muted)',
        lineHeight: '1.8'
    }
};

export default Weather;
