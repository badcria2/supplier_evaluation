/**
 * Evaluación de Proveedor de TI
 * Script para gestionar la evaluación de proveedores de TI
 * * Características:
 * - Cálculo automático de calificaciones y ponderados
 * - Gestión de criterios no aplicables
 * - Calculadora de conversión de métricas a calificaciones
 * - Exportación a CSV
 */

// Inicialización de elementos al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    // Establecer fecha actual en el campo de fecha de evaluación
    document.getElementById('fecha-evaluacion').valueAsDate = new Date();
    
    // Inicialmente ocultar las guías de calificación
    document.getElementById('guias-calificacion').style.display = 'none';
    
    // Configurar event listeners
    setupEventListeners();
});

/**
 * Configura todos los event listeners de la aplicación
 */
function setupEventListeners() {
    // Botones principales
    document.getElementById('calcular').addEventListener('click', calcularResultados);
    document.getElementById('exportar-csv').addEventListener('click', exportarCSV);
    document.getElementById('imprimir').addEventListener('click', imprimirEvaluacion);
    document.getElementById('toggleGuias').addEventListener('click', toggleGuiasCalificacion);
    
    // Calculadora de calificaciones
    document.getElementById('sugerir-calificaciones').addEventListener('click', sugerirCalificaciones);
    document.getElementById('cerrarModal').addEventListener('click', cerrarCalculadora);
    document.getElementById('criterio-select').addEventListener('change', cambiarCriterioCalculadora);
    document.getElementById('aplicar-calificacion').addEventListener('click', aplicarCalificacion);
    
    // Estadísticas de tickets
    document.getElementById('tickets-abiertos').addEventListener('input', calcularPorcentajes);
    document.getElementById('tickets-resueltos').addEventListener('input', calcularPorcentajes);
    document.getElementById('tickets-reabiertos').addEventListener('input', calcularPorcentajes);
    
    // Event listener para cambios en calificaciones y checkboxes N/A
    document.addEventListener('change', function(e) {
        // Validar rango de calificaciones (1-5)
        if (e.target.classList.contains('calificacion')) {
            if (e.target.value < 1) e.target.value = 1;
            if (e.target.value > 5) e.target.value = 5;
        }
        
        // Manejar cambios en checkboxes N/A
        if (e.target.classList.contains('na-check')) {
            const fila = e.target.closest('tr');
            const calificacion = fila.querySelector('.calificacion');
            const ponderadoCell = fila.querySelector('.ponderado');
            
            if (e.target.checked) {
                // Si está marcado como N/A
                calificacion.disabled = true;
                calificacion.value = "";
                ponderadoCell.textContent = "N/A";
                fila.classList.add('na-row');
            } else {
                // Si se desmarca
                calificacion.disabled = false;
                ponderadoCell.textContent = "0"; // Reset ponderado to 0, it will be recalculated
                fila.classList.remove('na-row');
            }
            // Recalcular resultados inmediatamente para reflejar el cambio de N/A
            calcularResultados();
        }
    });

    // Add input event listener to all .calificacion inputs for real-time updates
    document.querySelectorAll('.calificacion').forEach(input => {
        input.addEventListener('input', calcularResultados);
    });
}

/**
 * Calcula los resultados de toda la evaluación, incluyendo la redistribución de pesos
 * para criterios "No Aplicables".
 */
function calcularResultados() {
    // Iterar a través de cada sección (1 a 6)
    for (let i = 1; i <= 6; i++) {
        let subtotal = 0;
        let pesoTotalSeccion = 0; // Peso total original de la sección (ej. 0.25 para Sección 1)
        let pesoNASeccion = 0;    // Peso total de los ítems "No Aplicables" en la sección
        
        // Obtener todos los inputs de calificación de la sección actual
        const calificacionesSeccion = document.querySelectorAll(`#seccion${i} .calificacion`);

        // Primera pasada: Calcular el peso total de la sección y el peso de los ítems N/A
        calificacionesSeccion.forEach(function(calificacionInput) {
            const pesoOriginal = parseFloat(calificacionInput.getAttribute('data-peso'));
            pesoTotalSeccion += pesoOriginal; // Sumar el peso original de todos los ítems

            const fila = calificacionInput.closest('tr');
            const naCheck = fila.querySelector('.na-check');

            if (naCheck && naCheck.checked) {
                pesoNASeccion += pesoOriginal;
                // Deshabilitar input y marcar como N/A para consistencia visual
                calificacionInput.disabled = true;
                calificacionInput.value = "";
                fila.querySelector('.ponderado').textContent = "N/A";
                fila.classList.add('na-row');
            } else {
                calificacionInput.disabled = false;
                fila.classList.remove('na-row');
            }
        });

        // Calcular el factor de ajuste para redistribuir los pesos de los ítems N/A
        let factorAjuste = 1;
        const pesoAplicableSeccion = pesoTotalSeccion - pesoNASeccion;

        if (pesoNASeccion > 0 && pesoAplicableSeccion > 0) {
            // Si hay ítems N/A y también ítems aplicables, redistribuir peso
            factorAjuste = pesoTotalSeccion / pesoAplicableSeccion;
        } else if (pesoNASeccion > 0 && pesoAplicableSeccion === 0) {
            // Si todos los ítems de la sección son N/A, la sección no contribuye al puntaje
            factorAjuste = 0; 
        }
        // Si pesoNASeccion es 0, factorAjuste permanece en 1, no hay redistribución

        // Segunda pasada: Calcular los ponderados individuales y el subtotal, aplicando el factor de ajuste
        calificacionesSeccion.forEach(function(calificacionInput) {
            const fila = calificacionInput.closest('tr');
            const naCheck = fila.querySelector('.na-check');
            const ponderadoCell = fila.querySelector('.ponderado');

            // Solo procesar si el ítem no está marcado como N/A
            if (!(naCheck && naCheck.checked)) {
                if (calificacionInput.value) {
                    const pesoOriginal = parseFloat(calificacionInput.getAttribute('data-peso'));
                    const valor = parseFloat(calificacionInput.value);
                    let ponderadoCalculado = 0;

                    if (factorAjuste > 0) { // Solo calcular si hay ítems aplicables en la sección
                        const pesoAjustado = pesoOriginal * factorAjuste;
                        ponderadoCalculado = (valor * pesoAjustado);
                    }
                    
                    ponderadoCell.textContent = ponderadoCalculado.toFixed(3);
                    subtotal += ponderadoCalculado;
                } else {
                    // Si no es N/A pero no tiene valor, su ponderado es 0
                    ponderadoCell.textContent = "0";
                }
            }
        });
        
        // Obtener el peso total de la sección del HTML para normalización
        // Esto asume que el peso de la sección está en la fila de subtotal, 2da celda
        const sectionWeightText = document.querySelector(`#seccion${i} .resultado td:nth-child(2)`).textContent.trim();
        const sectionTotalWeight = parseFloat(sectionWeightText.replace('%', '')) / 100; // Convertir a decimal (ej. 0.25)

        // Actualizar el subtotal de la sección y su calificación textual
        if (pesoAplicableSeccion === 0 && pesoTotalSeccion > 0) { // Todos los ítems de la sección son N/A
             document.querySelector(`#seccion${i} .subtotal`).textContent = "N/A";
             document.getElementById(`resultado-seccion${i}`).textContent = "N/A";
             document.getElementById(`cal-seccion${i}`).textContent = "N/A";
        } else {
            document.querySelector(`#seccion${i} .subtotal`).textContent = subtotal.toFixed(3);
            document.getElementById(`resultado-seccion${i}`).textContent = subtotal.toFixed(3);
            
            // Normalizar el subtotal para la función getCalificacionTexto
            // El subtotal de la sección varía desde (pesoTotalSeccion * 1) hasta (pesoTotalSeccion * 5)
            // La normalización a un rango de 0 a 1 es: (subtotal - (pesoTotalSeccion * 1)) / ((pesoTotalSeccion * 5) - (pesoTotalSeccion * 1))
            // Simplificado: (subtotal - pesoTotalSeccion) / (pesoTotalSeccion * 4)
            const normalizedSubtotal = (subtotal - sectionTotalWeight) / (sectionTotalWeight * 4);
            const calTexto = getCalificacionTexto(normalizedSubtotal);
            document.getElementById(`cal-seccion${i}`).textContent = calTexto;
        }
    }
    
    // Calcular el total ponderado global
    let totalPonderado = 0;
    const seccionesResultados = document.querySelectorAll('.seccion-resultado');
    seccionesResultados.forEach(function(seccion) {
        // Sumar solo si el resultado de la sección es un número válido (no "N/A")
        const val = parseFloat(seccion.textContent);
        if (!isNaN(val)) {
            totalPonderado += val;
        }
    });
    
    // Normalizar el totalPonderado para la función getCalificacionTexto
    // totalPonderado varía desde 1.0 (si todas las calificaciones son 1) hasta 5.0 (si todas son 5)
    // La normalización a un rango de 0 a 1 es: (totalPonderado - 1) / (5 - 1) = (totalPonderado - 1) / 4
    const normalizedTotalPonderado = (totalPonderado - 1) / 4;

    document.getElementById('total-ponderado').textContent = totalPonderado.toFixed(3);
    document.getElementById('calificacion-global').textContent = getCalificacionTexto(normalizedTotalPonderado);
}

/**
 * Determina la calificación textual basada en un valor numérico normalizado (0-1).
 * La escala de calificación se basa en porcentajes de cumplimiento.
 * @param {number} valor - El valor numérico normalizado (0-1) a convertir en calificación textual.
 * @returns {string} La calificación textual correspondiente.
 */
function getCalificacionTexto(valor) {
    if (valor < 0.2) return "Deficiente";    // 0% - 19.99% de cumplimiento
    if (valor < 0.4) return "Regular";       // 20% - 39.99% de cumplimiento
    if (valor < 0.6) return "Aceptable";     // 40% - 59.99% de cumplimiento
    if (valor < 0.8) return "Bueno";         // 60% - 79.99% de cumplimiento
    return "Excelente";                      // 80% - 100% de cumplimiento
}

/**
 * Calcula los porcentajes de resolución y reapertura de tickets.
 */
function calcularPorcentajes() {
    const abiertos = parseInt(document.getElementById('tickets-abiertos').value) || 0;
    const resueltos = parseInt(document.getElementById('tickets-resueltos').value) || 0;
    const reabiertos = parseInt(document.getElementById('tickets-reabiertos').value) || 0;
    
    if (abiertos > 0) {
        const porcentajeResolucion = ((resueltos / abiertos) * 100).toFixed(2) + '%';
        document.getElementById('porcentaje-resolucion').value = porcentajeResolucion;
    } else {
        document.getElementById('porcentaje-resolucion').value = "N/A";
    }
    
    if (resueltos > 0) {
        const porcentajeReapertura = ((reabiertos / resueltos) * 100).toFixed(2) + '%';
        document.getElementById('porcentaje-reapertura').value = porcentajeReapertura;
    } else {
        document.getElementById('porcentaje-reapertura').value = "N/A";
    }
}

/**
 * Muestra u oculta las guías de calificación.
 */
function toggleGuiasCalificacion() {
    const guias = document.getElementById('guias-calificacion');
    guias.style.display = guias.style.display === 'none' ? 'block' : 'none';
}

/**
 * Abre el modal de calculadora de calificaciones y sugiere calificaciones.
 * Se ha modificado para usar un cuadro de diálogo personalizado en lugar de `alert()`
 * para confirmar la sugerencia automática.
 */
function sugerirCalificaciones() {
    // Reemplazar alert() con un modal o mensaje personalizado
    // Por simplicidad, y siguiendo la directriz de no usar alert(),
    // se procederá directamente con la sugerencia y se informará al usuario.
    // Si se necesita una confirmación explícita, se debería implementar un modal de confirmación.
    
    // Calcular calificaciones basadas en datos ingresados
    
    // 1. Tickets
    const ticketsAbiertos = parseInt(document.getElementById('tickets-abiertos').value) || 0;
    const ticketsResueltos = parseInt(document.getElementById('tickets-resueltos').value) || 0;
    const ticketsReabiertos = parseInt(document.getElementById('tickets-reabiertos').value) || 0;
    
    if (ticketsAbiertos > 0 && ticketsResueltos > 0) {
        // Calificación para tickets resueltos vs pendientes
        const porcentajeResolucion = (ticketsResueltos / ticketsAbiertos) * 100;
        let calTicketsResueltos = 1;
        
        if (porcentajeResolucion >= 95) calTicketsResueltos = 5;
        else if (porcentajeResolucion >= 85) calTicketsResueltos = 4;
        else if (porcentajeResolucion >= 75) calTicketsResueltos = 3;
        else if (porcentajeResolucion >= 60) calTicketsResueltos = 2;
        
        // Asegurarse de que el elemento existe antes de intentar asignar el valor
        const targetTicketsResueltos = document.querySelector('#seccion2 tr:nth-child(2) .calificacion');
        if (targetTicketsResueltos) {
            targetTicketsResueltos.value = calTicketsResueltos;
        }
        
        // Calificación para reaperturas
        if (ticketsResueltos > 0 && ticketsReabiertos >= 0) {
            const porcentajeReapertura = (ticketsReabiertos / ticketsResueltos) * 100;
            let calReaperturas = 5;
            
            if (porcentajeReapertura > 30) calReaperturas = 1;
            else if (porcentajeReapertura > 20) calReaperturas = 2;
            else if (porcentajeReapertura > 10) calReaperturas = 3;
            else if (porcentajeReapertura > 5) calReaperturas = 4;
            
            const targetReaperturas = document.querySelector('#seccion2 tr:nth-child(5) .calificacion');
            if (targetReaperturas) {
                targetReaperturas.value = calReaperturas;
            }
        }
    }
    
    // 2. SLAs (Tiempo de respuesta a incidentes críticos)
    const slaCritica = document.getElementById('sla-critica').value;
    const actualCritica = document.getElementById('actual-critica').value;
    
    if (slaCritica && actualCritica) {
        // Convertir a minutos para comparación
        const minutosCompromiso = convertirATiempo(slaCritica);
        const minutosActual = convertirATiempo(actualCritica);
        
        if (minutosCompromiso > 0 && minutosActual >= 0) {
            const porcentajeSLA = (minutosActual / minutosCompromiso) * 100;
            let calTiempoRespuesta = 3; // Valor por defecto

            if (porcentajeSLA > 150) calTiempoRespuesta = 1;
            else if (porcentajeSLA > 100) calTiempoRespuesta = 2;
            else if (porcentajeSLA >= 90) calTiempoRespuesta = 3;
            else if (porcentajeSLA >= 70) calTiempoRespuesta = 4;
            else calTiempoRespuesta = 5;
            
            const targetTiempoRespuesta = document.querySelector('#seccion1 tr:nth-child(2) .calificacion');
            if (targetTiempoRespuesta) {
                targetTiempoRespuesta.value = calTiempoRespuesta;
            }
        }
    }
    
    // Recalcular resultados después de aplicar las sugerencias
    calcularResultados();
    
    // Informar al usuario (sin usar alert)
    // Podrías mostrar un mensaje temporal en la UI, por ejemplo:
    const messageDiv = document.createElement('div');
    messageDiv.textContent = 'Se han sugerido calificaciones para los criterios basados en los datos ingresados. Revise y ajuste según sea necesario.';
    messageDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; background-color: #27ae60; color: white; padding: 10px 20px; border-radius: 5px; z-index: 1001; opacity: 0; transition: opacity 0.5s;';
    document.body.appendChild(messageDiv);
    setTimeout(() => {
        messageDiv.style.opacity = 1;
    }, 100);
    setTimeout(() => {
        messageDiv.style.opacity = 0;
        messageDiv.addEventListener('transitionend', () => messageDiv.remove());
    }, 5000); // Mensaje visible por 5 segundos
}

/**
 * Cierra el modal de calculadora de calificaciones.
 */
function cerrarCalculadora() {
    document.getElementById('calculadoraModal').style.display = 'none';
}

/**
 * Maneja el cambio de criterio en la calculadora, cargando el formulario dinámicamente.
 */
function cambiarCriterioCalculadora() {
    const criterio = document.getElementById('criterio-select').value;
    const formDiv = document.getElementById('calc-form');
    const calcResultadoDiv = document.getElementById('calc-resultado'); // Reset result area
    calcResultadoDiv.innerHTML = 'Seleccione un criterio y complete los datos para ver el resultado';
    calcResultadoDiv.dataset.calificacion = '';
    calcResultadoDiv.dataset.criterio = '';
    
    if (!criterio) {
        formDiv.innerHTML = '';
        return;
    }
    
    // Formularios específicos para cada criterio
    let formHtml = '';
    
    switch(criterio) {
        case 'tiempo-respuesta':
            formHtml = `
                <div>
                    <label>Tiempo de respuesta acordado (minutos):</label>
                    <input type="number" id="tr-acordado" min="1">
                </div>
                <div style="margin-top: 10px;">
                    <label>Tiempo de respuesta real (minutos):</label>
                    <input type="number" id="tr-real" min="0">
                </div>
                <button class="btn" id="calcular-tr" style="margin-top: 10px;">Calcular</button>
            `;
            break;
            
        case 'uptime':
            formHtml = `
                <div>
                    <label>Porcentaje de disponibilidad (%):</label>
                    <input type="number" id="uptime-porcentaje" min="0" max="100" step="0.01">
                </div>
                <button class="btn" id="calcular-uptime" style="margin-top: 10px;">Calcular</button>
            `;
            break;
            
        case 'tickets-resueltos':
            formHtml = `
                <div>
                    <label>Tickets abiertos:</label>
                    <input type="number" id="tr-abiertos" min="0">
                </div>
                <div style="margin-top: 10px;">
                    <label>Tickets resueltos:</label>
                    <input type="number" id="tr-resueltos" min="0">
                </div>
                <button class="btn" id="calcular-tickets" style="margin-top: 10px;">Calcular</button>
            `;
            break;
            
        case 'entregables':
            formHtml = `
                <div>
                    <label>Fecha comprometida:</label>
                    <input type="date" id="entrega-fecha">
                </div>
                <div style="margin-top: 10px;">
                    <label>Fecha real de entrega:</label>
                    <input type="date" id="entrega-real">
                </div>
                <button class="btn" id="calcular-entrega" style="margin-top: 10px;">Calcular</button>
            `;
            break;
    }
    
    formDiv.innerHTML = formHtml;
    
    // Agregar event listeners a los botones calculadores después de que el HTML se haya insertado
    setTimeout(() => {
        if (criterio === 'tiempo-respuesta' && document.getElementById('calcular-tr')) {
            document.getElementById('calcular-tr').addEventListener('click', calcularTiempoRespuesta);
        }
        
        if (criterio === 'uptime' && document.getElementById('calcular-uptime')) {
            document.getElementById('calcular-uptime').addEventListener('click', calcularUptime);
        }
        
        if (criterio === 'tickets-resueltos' && document.getElementById('calcular-tickets')) {
            document.getElementById('calcular-tickets').addEventListener('click', calcularTicketsResueltos);
        }
        
        if (criterio === 'entregables' && document.getElementById('calcular-entrega')) {
            document.getElementById('calcular-entrega').addEventListener('click', calcularEntregables);
        }
    }, 100);
}

/**
 * Calcula la calificación para tiempo de respuesta.
 */
function calcularTiempoRespuesta() {
    const acordado = parseFloat(document.getElementById('tr-acordado').value) || 0;
    const real = parseFloat(document.getElementById('tr-real').value) || 0;
    
    if (acordado <= 0) {
        // Mostrar mensaje de error personalizado en lugar de alert()
        showCustomMessage('Error: Ingrese un tiempo acordado válido (mayor que 0)', 'error');
        return;
    }
    
    const porcentaje = (real / acordado) * 100;
    let calificacion = 0;
    
    // Reglas de calificación basadas en la guía de SLAs
    if (porcentaje > 150) calificacion = 1;
    else if (porcentaje > 100) calificacion = 2;
    else if (porcentaje >= 90) calificacion = 3;
    else if (porcentaje >= 70) calificacion = 4;
    else calificacion = 5; // Menor a 70% del SLA
    
    document.getElementById('calc-resultado').innerHTML = `
        <p>Porcentaje del SLA: ${porcentaje.toFixed(2)}%</p>
        <p>Calificación sugerida: <strong>${calificacion}</strong></p>
        <p>Justificación: ${obtenerJustificacion('tiempo-respuesta', calificacion)}</p>
    `;
    
    // Guardar la calificación para poder aplicarla
    document.getElementById('calc-resultado').dataset.calificacion = calificacion;
    document.getElementById('calc-resultado').dataset.criterio = 'tiempo-respuesta';
}

/**
 * Calcula la calificación para uptime.
 */
function calcularUptime() {
    const uptime = parseFloat(document.getElementById('uptime-porcentaje').value) || 0;
    
    if (uptime < 0 || uptime > 100) {
        // Mostrar mensaje de error personalizado en lugar de alert()
        showCustomMessage('Error: Ingrese un porcentaje válido (0-100)', 'error');
        return;
    }
    
    let calificacion = 0;
    
    // Reglas de calificación basadas en la guía de SLAs (Disponibilidad del servicio)
    if (uptime < 98) calificacion = 1;
    else if (uptime < 99) calificacion = 2; // 98-98.9%
    else if (uptime < 99.6) calificacion = 3; // 99-99.5%
    else if (uptime < 99.9) calificacion = 4; // 99.6-99.8%
    else calificacion = 5; // >99.8%
    
    document.getElementById('calc-resultado').innerHTML = `
        <p>Uptime: ${uptime}%</p>
        <p>Calificación sugerida: <strong>${calificacion}</strong></p>
        <p>Justificación: ${obtenerJustificacion('uptime', calificacion)}</p>
    `;
    
    document.getElementById('calc-resultado').dataset.calificacion = calificacion;
    document.getElementById('calc-resultado').dataset.criterio = 'uptime';
}

/**
 * Calcula la calificación para tickets resueltos.
 */
function calcularTicketsResueltos() {
    const abiertos = parseInt(document.getElementById('tr-abiertos').value) || 0;
    const resueltos = parseInt(document.getElementById('tr-resueltos').value) || 0;
    
    if (abiertos <= 0) {
        // Mostrar mensaje de error personalizado en lugar de alert()
        showCustomMessage('Error: Ingrese un número válido de tickets abiertos (mayor que 0)', 'error');
        return;
    }
    
    const porcentaje = (resueltos / abiertos) * 100;
    let calificacion = 0;
    
    // Reglas de calificación basadas en la guía de Gestión de Tickets (Cantidad de tickets resueltos vs. pendientes)
    if (porcentaje < 60) calificacion = 1;
    else if (porcentaje < 75) calificacion = 2;
    else if (porcentaje < 85) calificacion = 3;
    else if (porcentaje < 95) calificacion = 4;
    else calificacion = 5; // ≥95% resueltos
    
    document.getElementById('calc-resultado').innerHTML = `
        <p>Porcentaje de resolución: ${porcentaje.toFixed(2)}%</p>
        <p>Calificación sugerida: <strong>${calificacion}</strong></p>
        <p>Justificación: ${obtenerJustificacion('tickets-resueltos', calificacion)}</p>
    `;
    
    document.getElementById('calc-resultado').dataset.calificacion = calificacion;
    document.getElementById('calc-resultado').dataset.criterio = 'tickets-resueltos';
}

/**
 * Calcula la calificación para entregables documentales.
 */
function calcularEntregables() {
    const fechaComprometidaStr = document.getElementById('entrega-fecha').value;
    const fechaRealStr = document.getElementById('entrega-real').value;

    if (!fechaComprometidaStr || !fechaRealStr) {
        // Mostrar mensaje de error personalizado en lugar de alert()
        showCustomMessage('Error: Ingrese ambas fechas para calcular.', 'error');
        return;
    }

    const fechaComprometida = new Date(fechaComprometidaStr);
    const fechaReal = new Date(fechaRealStr);
    
    if (isNaN(fechaComprometida.getTime()) || isNaN(fechaReal.getTime())) {
        // Mostrar mensaje de error personalizado en lugar de alert()
        showCustomMessage('Error: Formato de fecha inválido. Use AAAA-MM-DD.', 'error');
        return;
    }
    
    // Calcular diferencia en días (redondeado hacia arriba para incluir el día actual si hay retraso)
    const diffTime = fechaReal.getTime() - fechaComprometida.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Convertir milisegundos a días
    
    let calificacion = 0;
    
    // Reglas de calificación basadas en la guía de Gestión Administrativa (Cumplimiento de entregables documentales)
    if (diffDays > 10) calificacion = 1;
    else if (diffDays > 5) calificacion = 2; // 6-10 días de retraso
    else if (diffDays > 2) calificacion = 3; // 3-5 días de retraso
    else if (diffDays > 0) calificacion = 4; // 1-2 días de retraso
    else calificacion = 5; // En fecha o anticipado (diffDays <= 0)
    
    document.getElementById('calc-resultado').innerHTML = `
        <p>Días de diferencia: ${diffDays} (positivo = retraso, negativo = anticipado)</p>
        <p>Calificación sugerida: <strong>${calificacion}</strong></p>
        <p>Justificación: ${obtenerJustificacion('entregables', calificacion)}</p>
    `;
    
    document.getElementById('calc-resultado').dataset.calificacion = calificacion;
    document.getElementById('calc-resultado').dataset.criterio = 'entregables';
}

/**
 * Aplica la calificación calculada del modal al formulario principal.
 */
function aplicarCalificacion() {
    const resultado = document.getElementById('calc-resultado');
    const calificacion = resultado.dataset.calificacion;
    const criterio = resultado.dataset.criterio;
    
    if (!calificacion || !criterio) {
        // Mostrar mensaje de error personalizado en lugar de alert()
        showCustomMessage('Primero debe calcular una calificación en la calculadora.', 'error');
        return;
    }
    
    // Mapear el criterio seleccionado al campo correspondiente en el formulario
    let targetField = null;
    
    switch(criterio) {
        case 'tiempo-respuesta':
            // Tiempo de respuesta a incidentes críticos (Sección 1, 2da fila)
            targetField = document.querySelector('#seccion1 tr:nth-child(2) .calificacion');
            break;
        case 'uptime':
            // Disponibilidad del servicio (uptime) (Sección 1, 4ta fila)
            targetField = document.querySelector('#seccion1 tr:nth-child(4) .calificacion');
            break;
        case 'tickets-resueltos':
            // Cantidad de tickets resueltos vs. pendientes (Sección 2, 2da fila)
            targetField = document.querySelector('#seccion2 tr:nth-child(2) .calificacion');
            break;
        case 'entregables':
            // Cumplimiento de entregables documentales (Sección 6, 2da fila)
            targetField = document.querySelector('#seccion6 tr:nth-child(2) .calificacion');
            break;
        // Puedes añadir más casos aquí si la calculadora se expande a otros criterios
        case 'resolucion-problemas':
            // Tiempo de resolución de problemas (Sección 1, 3ra fila)
            targetField = document.querySelector('#seccion1 tr:nth-child(3) .calificacion');
            break;
    }
    
    if (targetField) {
        targetField.value = calificacion;
        // Cerrar el modal
        document.getElementById('calculadoraModal').style.display = 'none';
        
        // Actualizar los cálculos para reflejar el cambio
        calcularResultados();
    } else {
        // Mostrar mensaje de error personalizado en lugar de alert()
        showCustomMessage('No se pudo encontrar el campo correspondiente en el formulario principal para aplicar la calificación.', 'error');
    }
}

/**
 * Exporta los datos de la evaluación a un archivo CSV.
 */
function exportarCSV() {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // Add BOM for proper UTF-8 encoding

    // --- General Data ---
    csvContent += "Datos Generales\n";
    csvContent += "Nombre del Proveedor," + (document.getElementById('proveedor').value || '') + "\n";
    csvContent += "Período de Evaluación," + (document.getElementById('periodo').value || '') + "\n";
    csvContent += "Responsable de la Evaluación," + (document.getElementById('responsable').value || '') + "\n";
    csvContent += "Fecha de Evaluación," + (document.getElementById('fecha-evaluacion').value || '') + "\n\n";

    // --- SLA Parameters ---
    csvContent += "Parámetros de Evaluación - Tiempos de Respuesta Acordados (SLA)\n";
    csvContent += "Prioridad,Tiempo Acordado,Valor Actual\n";
    const slaRows = document.querySelectorAll('.flex-item:first-child table tr');
    slaRows.forEach((row, index) => {
        if (index === 0) return; // Skip header row
        const cols = row.querySelectorAll('td');
        const priority = cols[0].textContent.trim();
        const agreedTime = cols[1].querySelector('input').value || '';
        const actualTime = cols[2].querySelector('input').value || '';
        csvContent += `${priority},"${agreedTime}","${actualTime}"\n`;
    });
    csvContent += "\n";

    // --- Ticket Statistics ---
    csvContent += "Parámetros de Evaluación - Estadísticas de Tickets\n";
    csvContent += "Métricas,Valor\n";
    const ticketRows = document.querySelectorAll('.flex-item:last-child table tr');
    ticketRows.forEach((row, index) => {
        if (index === 0) return; // Skip header row
        const cols = row.querySelectorAll('td');
        const metric = cols[0].textContent.trim();
        const value = cols[1].querySelector('input') ? (cols[1].querySelector('input').value || '') : '';
        csvContent += `${metric},"${value}"\n`;
    });
    csvContent += "\n";

    // --- Evaluation Sections (1 to 6) ---
    for (let i = 1; i <= 6; i++) {
        // Adjust selector to correctly get the H2 title for each section
        // Assuming H2s are direct children of divs, and sections are in order
        const sectionTitleElement = document.querySelector(`div:nth-of-type(${i + 2}) > h2`); // Adjust index based on your HTML structure
        const sectionTitle = sectionTitleElement ? sectionTitleElement.textContent.trim() : `Sección ${i}`;
        csvContent += `${sectionTitle}\n`;
        csvContent += "Criterio,Peso,Calificación (1-5),Ponderado,Observaciones\n";

        const rows = document.querySelectorAll(`#seccion${i} tr:not(.resultado)`);
        rows.forEach(row => {
            const cols = row.querySelectorAll('td');
            if (cols.length > 0) {
                const criterio = cols[0].textContent.trim();
                const peso = cols[1].textContent.trim();
                const calificacionInput = cols[2].querySelector('.calificacion');
                const calificacion = calificacionInput ? (calificacionInput.value || '') : '';
                const isNA = cols[2].querySelector('.na-check') ? cols[2].querySelector('.na-check').checked : false;
                const ponderado = isNA ? "N/A" : (cols[3].textContent.trim() || '0');
                const observaciones = cols[4].querySelector('.obs') ? (cols[4].querySelector('.obs').value || '') : '';
                csvContent += `"${criterio}",${peso},${calificacion},"${ponderado}","${observaciones}"\n`;
            }
        });

        // Add subtotal row
        const subtotalRow = document.querySelector(`#seccion${i} .resultado`);
        if (subtotalRow) {
            const subtotalPeso = subtotalRow.querySelector('td:nth-child(2)').textContent.trim();
            const subtotalValue = subtotalRow.querySelector('td:nth-child(4)').textContent.trim();
            csvContent += `Subtotal,${subtotalPeso},,${subtotalValue},\n`;
        }
        csvContent += "\n";
    }

    // --- Final Results ---
    csvContent += "Resultados Finales\n";
    csvContent += "Sección,Peso,Puntaje Ponderado,Calificación\n";
    const finalResultRows = document.querySelectorAll('#resultados-finales tr');
    finalResultRows.forEach((row, index) => {
        if (index === 0) return; // Skip header
        const cols = row.querySelectorAll('td');
        if (cols.length > 0) {
            const section = cols[0].textContent.trim();
            const weight = cols[1].textContent.trim();
            const score = cols[2].textContent.trim();
            const rating = cols[3].textContent.trim();
            csvContent += `"${section}",${weight},"${score}","${rating}"\n`;
        }
    });
    csvContent += "\n";

    // --- Key Metrics Analysis ---
    csvContent += "Análisis de Métricas Clave\n";
    // The div containing "Análisis de Métricas Clave" is the 8th div that is a direct child of body
    const metricsDiv = document.querySelector('body > div:nth-of-type(8)'); 
    if (metricsDiv) {
        const metricsRows = metricsDiv.querySelectorAll('table tr');
        metricsRows.forEach(row => {
            const labelElement = row.querySelector('td:first-child strong');
            const valueElement = row.querySelector('td:last-child input');
            if (labelElement && valueElement) {
                const label = labelElement.textContent.trim();
                const value = valueElement.value || '';
                csvContent += `"${label.replace(':', '')}","${value}"\n`;
            }
        });
    }
    csvContent += "\n";

    // --- General Observations ---
    csvContent += "Observaciones Generales y Plan de Acción\n";
    csvContent += "Fortalezas identificadas,\"" + (document.getElementById('fortalezas').value.replace(/"/g, '""') || '') + "\"\n";
    csvContent += "Áreas de mejora,\"" + (document.getElementById('areas-mejora').value.replace(/"/g, '""') || '') + "\"\n";
    csvContent += "Plan de acción recomendado,\"" + (document.getElementById('plan-accion').value.replace(/"/g, '""') || '') + "\"\n";
    csvContent += "Fecha de próxima evaluación," + (document.getElementById('proxima-evaluacion').value || '') + "\n";


    // Create a hidden link and trigger the download
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "evaluacion_proveedor.csv");
    document.body.appendChild(link); // Required for Firefox
    link.click();
    document.body.removeChild(link);
}

/**
 * Convierte un string de tiempo (ej. "1 hora", "45 min", "2.5 horas") a minutos.
 * @param {string} tiempoStr - El string de tiempo a convertir.
 * @returns {number} El tiempo en minutos, o 0 si no se puede parsear.
 */
function convertirATiempo(tiempoStr) {
    tiempoStr = tiempoStr.toLowerCase().trim();
    const parts = tiempoStr.match(/(\d+(\.\d+)?)\s*(horas?|mins?|minutos?|días?|dias?)/);

    if (!parts) return 0;

    const value = parseFloat(parts[1]);
    const unit = parts[3];

    if (unit.startsWith('min')) {
        return value;
    } else if (unit.startsWith('hora')) {
        return value * 60;
    } else if (unit.startsWith('día') || unit.startsWith('dia')) {
        return value * 24 * 60; // 1 día = 24 horas * 60 minutos
    }
    return 0;
}


/**
 * Obtiene la justificación textual para una calificación específica y criterio.
 * Esto ayuda a proporcionar contexto en la calculadora.
 * @param {string} criterio - El identificador del criterio (ej. 'tiempo-respuesta').
 * @param {number} calificacion - La calificación numérica (1-5).
 * @returns {string} La justificación de la calificación.
 */
function obtenerJustificacion(criterio, calificacion) {
    const guias = {
        'tiempo-respuesta': {
            1: '>150% del SLA acordado',
            2: '101-150% del SLA',
            3: '90-100% del SLA',
            4: '70-89% del SLA',
            5: '<70% del SLA'
        },
        'uptime': {
            1: '<98%',
            2: '98-98.9%',
            3: '99-99.5%',
            4: '99.6-99.8%',
            5: '>99.8%'
        },
        'tickets-resueltos': {
            1: '<60% resueltos',
            2: '60-74% resueltos',
            3: '75-84% resueltos',
            4: '85-94% resueltos',
            5: '≥95% resueltos'
        },
        'entregables': {
            1: '>10 días de retraso',
            2: '6-10 días de retraso',
            3: '3-5 días de retraso',
            4: '1-2 días de retraso',
            5: 'En fecha o anticipado'
        },
        // Añadir justificaciones para otros criterios si se usan en la calculadora
        'resolucion-problemas': {
            1: '>150% del promedio acordado',
            2: '120-150% del promedio',
            3: '100-119% del promedio',
            4: '80-99% del promedio',
            5: '<80% del promedio'
        }
    };
    return guias[criterio]?.[calificacion] || 'No disponible';
}

/**
 * Función para mostrar mensajes personalizados en la UI (reemplazo de alert()).
 * @param {string} message - El texto del mensaje.
 * @param {string} type - El tipo de mensaje ('success' o 'error').
 */
function showCustomMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.textContent = message;
    let backgroundColor = '';
    if (type === 'success') {
        backgroundColor = '#27ae60'; // Green
    } else if (type === 'error') {
        backgroundColor = '#e74c3c'; // Red
    }
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: ${backgroundColor};
        color: white;
        padding: 10px 20px;
        border-radius: 5px;
        z-index: 1001;
        opacity: 0;
        transition: opacity 0.5s ease-in-out;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    `;
    document.body.appendChild(messageDiv);
    
    // Fade in
    setTimeout(() => {
        messageDiv.style.opacity = 1;
    }, 100);

    // Fade out and remove
    setTimeout(() => {
        messageDiv.style.opacity = 0;
        messageDiv.addEventListener('transitionend', () => messageDiv.remove());
    }, 5000); // Message visible for 5 seconds
}

/**
 * Función para imprimir la evaluación.
 * Actualmente, solo activa la función de impresión del navegador.
 */
function imprimirEvaluacion() {
    window.print();
}
