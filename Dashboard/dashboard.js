const app = Vue.createApp({
    data() {
        return {
            showForm: false,
            event: {
                title: '',
                date: '',
                time: '',
                endTime: '',
                type: 'lesson'
            },
            events: [],
            calendar: null,
            selectedEvent: {},
            selectedEventElement: null,
            editMode: false
        };
    },
    methods: {
        showEventForm() {
            this.showForm = !this.showForm;
            console.log('Add Event clicked, showForm:', this.showForm);
        },
        addEvent() {
            this.events.push({ ...this.event });
            console.log('Event saved:', this.event);
            console.log('All events:', this.events);
            this.showForm = false;
            this.event = { title: '', date: '', time: '', endTime: '', type: 'lesson' };
            this.updateCalendar();
        },
        updateCalendar() {
            if (this.calendar) {
                this.calendar.getEvents().forEach(event => event.remove());
                this.events.forEach(event => {
                    this.calendar.addEvent({
                        title: `${event.title} (${event.type})`,
                        start: `${event.date}T${event.time}`,
                        end: event.endTime ? `${event.date}T${event.endTime}` : null,
                        allDay: false,
                        className: event.type
                    });
                });
            }
        },
        handleEventDrop(info) {
            const event = info.event;
            const newStart = event.start.toISOString();
            const newEnd = event.end ? event.end.toISOString() : null;
            const [newDate, newTime] = newStart.split('T');
            const startTime = newTime.split(':').slice(0, 2).join(':');
            let endTime = null;
            if (newEnd) {
                const [, newEndTime] = newEnd.split('T');
                endTime = newEndTime.split(':').slice(0, 2).join(':');
            }
            console.log('Event dropped:', { title: event.title, date: newDate, startTime, endTime });
            this.events = this.events.map(ev => {
                if (`${ev.title} (${ev.type})` === event.title) {
                    return { ...ev, date: newDate, time: startTime, endTime: endTime || ev.endTime };
                }
                return ev;
            });
            console.log('Updated events:', this.events);
        },
        handleEventClick(info) {
            if (!window.bootstrap) {
                console.error('Bootstrap JS not loaded, falling back to alert');
                if (confirm(`Delete "${info.event.title}"?`)) {
                    info.event.remove();
                    this.events = this.events.filter(ev => 
                        `${ev.title} (${ev.type})` !== info.event.title ||
                        `${ev.date}T${ev.time}` !== info.event.startStr
                    );
                    console.log('Event deleted:', info.event.title);
                    console.log('Updated events:', this.events);
                }
                return;
            }
            const event = info.event;
            const newDate = event.start.toISOString().split('T')[0];
            const startTime = event.start.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
            let endTime = null;
            if (event.end) {
                endTime = event.end.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
            }
            this.selectedEvent = {
                title: event.title.replace(` (${event.classNames[0]})`, ''),
                date: newDate,
                startTime,
                endTime,
                type: event.classNames[0],
                originalTitle: event.title,
                originalStart: `${newDate}T${startTime}`
            };
            this.selectedEventElement = event;
            this.editMode = false;
            const modalEl = document.getElementById('eventModal');
            if (modalEl) {
                modalEl.setAttribute('aria-hidden', 'false');
                const modal = new bootstrap.Modal(modalEl);
                modal.show();
                modalEl.addEventListener('hidden.bs.modal', () => {
                    modalEl.setAttribute('aria-hidden', 'true');
                }, { once: true });
            } else {
                console.error('Modal element not found');
            }
        },
        deleteEvent() {
            if (this.selectedEventElement) {
                this.selectedEventElement.remove();
                this.events = this.events.filter(ev => 
                    `${ev.title} (${ev.type})` !== this.selectedEvent.originalTitle ||
                    `${ev.date}T${ev.time}` !== this.selectedEvent.originalStart
                );
                console.log('Event deleted:', this.selectedEvent.originalTitle);
                console.log('Updated events:', this.events);
                const modalEl = document.getElementById('eventModal');
                if (modalEl && window.bootstrap) {
                    const modal = bootstrap.Modal.getInstance(modalEl);
                    if (modal) modal.hide();
                }
            }
        },
        saveEditedEvent() {
            if (this.selectedEventElement) {
                this.selectedEventElement.remove();
                this.events = this.events.filter(ev => 
                    `${ev.title} (${ev.type})` !== this.selectedEvent.originalTitle ||
                    `${ev.date}T${ev.time}` !== this.selectedEvent.originalStart
                );
                this.events.push({
                    title: this.selectedEvent.title,
                    date: this.selectedEvent.date,
                    time: this.selectedEvent.startTime,
                    endTime: this.selectedEvent.endTime,
                    type: this.selectedEvent.type
                });
                console.log('Event updated:', this.selectedEvent);
                console.log('All events:', this.events);
                this.updateCalendar();
                const modalEl = document.getElementById('eventModal');
                if (modalEl && window.bootstrap) {
                    const modal = bootstrap.Modal.getInstance(modalEl);
                    if (modal) modal.hide();
                }
                this.editMode = false;
            }
        }
    },
    mounted() {
        console.log('FullCalendar available:', typeof window.FullCalendar);
        const calendarEl = document.getElementById('calendar');
        console.log('Calendar element:', calendarEl);
        if (calendarEl && window.FullCalendar) {
            this.calendar = new window.FullCalendar.Calendar(calendarEl, {
                initialView: 'timeGridWeek',
                headerToolbar: {
                    left: 'prev,next',
                    center: 'title',
                    right: 'timeGridWeek,timeGridDay'
                },
                editable: true,
                height: 'auto',
                slotMinTime: '08:00:00',
                slotMaxTime: '22:00:00',
                events: this.events.map(event => ({
                    title: `${event.title} (${event.type})`,
                    start: `${event.date}T${event.time}`,
                    end: event.endTime ? `${event.date}T${event.endTime}` : null,
                    allDay: false,
                    className: event.type
                })),
                eventDrop: this.handleEventDrop.bind(this),
                eventClick: this.handleEventClick.bind(this)
            });
            console.log('FullCalendar initialized:', this.calendar);
            this.calendar.render();
        } else {
            console.log('Calendar initialization failed: FullCalendar or element missing');
        }
    }
}).mount('#app');