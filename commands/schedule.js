const Schedule = require('../models/Schedule');
const isAdmin = require('../lib/isAdmin');
const isOwnerOrSudo = require('../lib/isOwner');

function formatScheduleItem(item) {
  return `👤 ${item.name}\n📌 Género: ${item.gender}\n🕒 Horario: ${item.schedule}`;
}

async function scheduleCommand(sock, chatId, message, rawText, senderId) {
  const rawArgs = rawText.trim().slice('.horario'.length).trim();

  if (!rawArgs) {
    const schedules = await Schedule.find({}).sort({ nameLower: 1 });
    if (!schedules || schedules.length === 0) {
      return sock.sendMessage(chatId, { text: '📭 No hay horarios registrados actualmente.' }, { quoted: message });
    }

    const lines = schedules.map(item => formatScheduleItem(item));
    const text = ` 〔 🗓️ HORARIO 〕\n\n${lines.join('\n\n')}`;
    return sock.sendMessage(chatId, { text }, { quoted: message });
  }

  const [namePart, rest] = rawArgs.split(':');
  if (!namePart || !rest) {
    return sock.sendMessage(chatId, { text: '❌ Formato inválido. Usa: .horario Nombre: Género Horario' }, { quoted: message });
  }

  const name = namePart.trim();
  const restText = rest.trim();
  const restParts = restText.split(' ');
  if (restParts.length < 2) {
    return sock.sendMessage(chatId, { text: '❌ Formato inválido. Usa: .horario Nombre: Género Horario' }, { quoted: message });
  }

  const gender = restParts.shift().trim();
  const schedule = restParts.join(' ').trim();

  if (!name || !gender || !schedule) {
    return sock.sendMessage(chatId, { text: '❌ Formato inválido. Usa: .horario Nombre: Género Horario' }, { quoted: message });
  }

  const adminStatus = await isAdmin(sock, chatId, senderId);
  const senderIsAdmin = adminStatus.isSenderAdmin;
  const isOwner = await isOwnerOrSudo(senderId, sock, chatId);

  if (!message.key.fromMe && !senderIsAdmin && !isOwner) {
    return sock.sendMessage(chatId, { text: '🚫 No tienes permisos para usar este comando.' }, { quoted: message });
  }

  try {
    const nameLower = name.toLowerCase().trim();
    let scheduleItem = await Schedule.findOne({ nameLower });
    const created = !scheduleItem;

    if (!scheduleItem) {
      scheduleItem = new Schedule({ name, gender, schedule, nameLower });
    } else {
      scheduleItem.name = name;
      scheduleItem.gender = gender;
      scheduleItem.schedule = schedule;
      scheduleItem.updatedAt = new Date();
    }

    await scheduleItem.save();

    if (created) {
      return sock.sendMessage(chatId, {
        text: `✅ Usuario agregado correctamente.\n\n👤 Nombre: ${scheduleItem.name}\n📌 Género: ${scheduleItem.gender}\n🕒 Horario: ${scheduleItem.schedule}`
      }, { quoted: message });
    }

    return sock.sendMessage(chatId, {
      text: `♻️ Horario actualizado correctamente.\n\n👤 Nombre: ${scheduleItem.name}\n📌 Género: ${scheduleItem.gender}\n🕒 Horario: ${scheduleItem.schedule}`
    }, { quoted: message });
  } catch (error) {
    console.error('Error scheduleCommand:', error);
    return sock.sendMessage(chatId, { text: '❌ Ocurrió un error al guardar el horario. Intenta de nuevo más tarde.' }, { quoted: message });
  }
}

async function deleteScheduleCommand(sock, chatId, message, userMessage, senderId) {
  const name = userMessage.trim().slice('.dlt'.length).trim();
  if (!name) {
    return sock.sendMessage(chatId, { text: '❌ Debes indicar un nombre. Ejemplo: .dlt Felipe' }, { quoted: message });
  }

  const adminStatus = await isAdmin(sock, chatId, senderId);
  const senderIsAdmin = adminStatus.isSenderAdmin;
  const isOwner = await isOwnerOrSudo(senderId, sock, chatId);

  if (!message.key.fromMe && !senderIsAdmin && !isOwner) {
    return sock.sendMessage(chatId, { text: '🚫 No tienes permisos para usar este comando.' }, { quoted: message });
  }

  const scheduleItem = await Schedule.findOneAndDelete({ nameLower: name.toLowerCase().trim() });
  if (!scheduleItem) {
    return sock.sendMessage(chatId, { text: `❌ No existe ningún horario registrado para "${name}".` }, { quoted: message });
  }

  return sock.sendMessage(chatId, {
    text: `🗑️ Usuario eliminado correctamente.\n\n👤 Nombre: ${scheduleItem.name}`
  }, { quoted: message });
}

async function deleteAllSchedulesCommand(sock, chatId, message, userMessage, senderId) {
  const isOwner = await isOwnerOrSudo(senderId, sock, chatId);
  if (!message.key.fromMe && !isOwner) {
    return sock.sendMessage(chatId, { text: '🚫 No tienes permisos para usar este comando.' }, { quoted: message });
  }

  const confirmText = userMessage.trim().slice('.dltall'.length).trim().toLowerCase();
  if (!['confirm', 'confirmar', 'si', 'sí', 'yes'].includes(confirmText)) {
    return sock.sendMessage(chatId, {
      text: '⚠️ Para eliminar todos los horarios, confirma la acción con:\n.dltall confirm'
    }, { quoted: message });
  }

  try {
    const result = await Schedule.deleteMany({});
    return sock.sendMessage(chatId, {
      text: `🧹 Todos los horarios fueron eliminados correctamente.\n\n📊 Registros eliminados: ${result.deletedCount}`
    }, { quoted: message });
  } catch (error) {
    console.error('Error deleteAllSchedulesCommand:', error);
    return sock.sendMessage(chatId, { text: '❌ Ocurrió un error al eliminar los horarios. Intenta de nuevo más tarde.' }, { quoted: message });
  }
}

module.exports = {
  scheduleCommand,
  deleteScheduleCommand,
  deleteAllSchedulesCommand,
};
